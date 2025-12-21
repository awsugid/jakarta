import { useState } from "react";

export default function DemoCounter() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl my-6 text-center">
      <h3 className="text-xl font-bold text-white mb-4">
        Interactive Component Demo
      </h3>
      <p className="text-gray-300 mb-4">
        This is a React component embedded directly in Markdown!
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          -
        </button>
        <span className="text-2xl font-mono font-bold text-orange-400 w-12">
          {count}
        </span>
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
