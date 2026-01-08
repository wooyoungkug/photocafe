import Image from "next/image";

export const metadata = {
  title: "모델 관리",
};

export default function ModelsPage() {
  const models = [
    {
      id: "claude-opus-4-5",
      name: "Claude Opus 4.5",
      desc: "Claude Opus 4.5 모델",
      img: "/images/models/claude-opus-4-5.svg",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">모델 관리</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800"
          >
            <div className="h-12 w-12 flex-shrink-0">
              <img src={m.img} alt={m.name} className="h-12 w-12" />
            </div>
            <div>
              <div className="text-white font-medium">{m.name}</div>
              <div className="text-sm text-slate-400">{m.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
