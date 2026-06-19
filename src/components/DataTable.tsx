interface Props {
  children: React.ReactNode;
  className?: string;
}

export default function DataTable({ children, className = "" }: Props) {
  return (
    <div className={`mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
