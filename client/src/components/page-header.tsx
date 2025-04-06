import React from 'react';

interface PageHeaderProps {
  heading: string;
  subheading?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ heading, subheading }) => {
  return (
    <div className="pb-6">
      <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
      {subheading && <p className="text-muted-foreground mt-1">{subheading}</p>}
    </div>
  );
}