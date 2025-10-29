import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Exclude ffmpeg-static from ASAR so it can be required and its binary accessed
    // The binary must be unpacked to be executable
    // Patterns are relative to the app root in the packaged app  
    // Match both the directory and the binary file explicitly
    asarUnpack: [
      'node_modules/ffmpeg-static/**',
      'node_modules/ffmpeg-static/**/*',
      'node_modules/ffmpeg-static/ffmpeg',
    ],
    name: 'ollo',
    executableName: 'ollo',
    // macOS-specific configuration
    darwinBundleIdentifier: 'com.ollo.app',
    appBundleId: 'com.ollo.app',
    // Icon configuration (optional - Electron uses default if not provided)
    // icon: './assets/icon', // Uncomment when icon is ready
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // CRITICAL: AutoUnpackNativesPlugin unpacks FFmpeg binary to app.asar.unpacked
    // This allows FFmpeg to be accessible at runtime in packaged app
    new AutoUnpackNativesPlugin(),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    packageAfterCopy: async (config, buildPath) => {
      // Copy production dependencies to the build directory
      // This is needed because Vite plugin only bundles code, not dependencies
      const fs = require('fs');
      const path = require('path');
      
      // Copy ffmpeg-static and other production dependencies
      const depsToCopy = ['ffmpeg-static', 'uuid', 'electron-squirrel-startup'];
      const nodeModulesSrc = path.join(process.cwd(), 'node_modules');
      const nodeModulesDest = path.join(buildPath, 'node_modules');
      
      if (!fs.existsSync(nodeModulesDest)) {
        fs.mkdirSync(nodeModulesDest, { recursive: true });
      }
      
      for (const dep of depsToCopy) {
        const srcPath = path.join(nodeModulesSrc, dep);
        const destPath = path.join(nodeModulesDest, dep);
        
        if (fs.existsSync(srcPath)) {
          // Use cp -r equivalent for directories
          const { execSync } = require('child_process');
          execSync(`cp -R "${srcPath}" "${destPath}"`, { stdio: 'inherit' });
          console.log(`[Hook] Copied ${dep} to build directory`);
          
          // For ffmpeg-static, ensure the binary has executable permissions
          if (dep === 'ffmpeg-static') {
            const ffmpegBinary = path.join(destPath, 'ffmpeg');
            if (fs.existsSync(ffmpegBinary)) {
              fs.chmodSync(ffmpegBinary, 0o755); // rwxr-xr-x
              console.log(`[Hook] Set executable permissions on ${ffmpegBinary}`);
            }
          }
        }
      }
    },
    postPackage: async (forgeConfig, options) => {
      // After packaging, manually unpack FFmpeg binary
      // asarUnpack pattern doesn't seem to work reliably, so we'll do it manually
      const fs = require('fs');
      const path = require('path');
      const { execSync } = require('child_process');
      
      // Extract build path
      const buildPath = typeof options === 'string' ? options : (options.outputPaths && options.outputPaths[0]) || options?.appOutDir || options;
      
      const appBundlePath = path.join(buildPath, 'ollo.app', 'Contents', 'Resources');
      
      if (!fs.existsSync(appBundlePath)) {
        console.warn('[Hook] App bundle path not found:', appBundlePath);
        return;
      }
      
      // Create unpacked directory structure
      const unpackedDir = path.join(appBundlePath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static');
      if (!fs.existsSync(unpackedDir)) {
        fs.mkdirSync(unpackedDir, { recursive: true });
      }
      
      // Copy FFmpeg binary from local node_modules to unpacked directory
      // This ensures the binary is accessible and executable in packaged app
      const localFfmpeg = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
      const localIndex = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'index.js');
      const localPackage = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'package.json');
      
      const unpackedFfmpeg = path.join(unpackedDir, 'ffmpeg');
      const unpackedIndex = path.join(unpackedDir, 'index.js');
      const unpackedPackage = path.join(unpackedDir, 'package.json');
      
      try {
        // Copy FFmpeg binary
        if (fs.existsSync(localFfmpeg)) {
          fs.copyFileSync(localFfmpeg, unpackedFfmpeg);
          fs.chmodSync(unpackedFfmpeg, 0o755);
          console.log('[Hook] Copied FFmpeg binary to unpacked directory');
        } else {
          console.warn('[Hook] Local FFmpeg binary not found at:', localFfmpeg);
        }
        
        // Copy index.js (needed for require('ffmpeg-static'))
        if (fs.existsSync(localIndex)) {
          fs.copyFileSync(localIndex, unpackedIndex);
        }
        
        // Copy package.json (needed for require('ffmpeg-static'))
        if (fs.existsSync(localPackage)) {
          fs.copyFileSync(localPackage, unpackedPackage);
        }
      } catch (error) {
        console.error('[Hook] Failed to copy FFmpeg files:', error);
      }
    },
  },
};

export default config;
