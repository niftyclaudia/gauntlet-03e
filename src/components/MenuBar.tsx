/**
 * MenuBar Component
 * 
 * Top menu bar with File, Edit, Title, View, Help menus (OpenShot style)
 */

import React from 'react';

const MenuBar: React.FC = () => {
  return (
    <div className="flex items-center h-6 bg-[#252525] border-b border-[#333333] px-2 text-white text-xs font-normal">
      <div className="flex items-center gap-4 px-2">
        <span className="hover:bg-[#333333] px-2 py-0.5 rounded cursor-pointer">File</span>
        <span className="hover:bg-[#333333] px-2 py-0.5 rounded cursor-pointer">Edit</span>
        <span className="hover:bg-[#333333] px-2 py-0.5 rounded cursor-pointer">Title</span>
        <span className="hover:bg-[#333333] px-2 py-0.5 rounded cursor-pointer">View</span>
        <span className="hover:bg-[#333333] px-2 py-0.5 rounded cursor-pointer">Help</span>
      </div>
    </div>
  );
};

export default MenuBar;

