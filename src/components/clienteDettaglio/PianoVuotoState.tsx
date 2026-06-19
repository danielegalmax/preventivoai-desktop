type Props = {
  emoji: string;
  title: string;
  description: string;
};

export default function PianoVuotoState({ emoji, title, description }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="text-4xl">{emoji}</span>
      <h3 className="mt-3 text-base font-semibold text-brand-navy">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-brand-navy/50">{description}</p>
    </div>
  );
}
