import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-500 to-cyan-400 bg-clip-text text-transparent">
          Trình tạo đề kiểm tra Tiếng Anh
        </h1>
        <p className="text-slate-500 mt-2 text-base">
          Dựa trên chương trình Sách giáo khoa Global Success
        </p>
      </div>
    </header>
  );
};

export default Header;
