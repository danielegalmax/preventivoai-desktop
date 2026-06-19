interface Props {
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}

export default function PageContainer({ children, wide = false, className = "" }: Props) {
  return (
    <div className={`mx-auto w-full px-4 py-4 sm:px-6 lg:py-8 ${wide ? "max-w-7xl" : "max-w-5xl"} ${className}`}>
      {children}
    </div>
  );
}
