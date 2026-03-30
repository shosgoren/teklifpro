'use client';

import NextLink from 'next/link';
import * as React from 'react';
import { cn } from '@/shared/utils/cn';

export interface LinkProps extends React.ComponentProps<typeof NextLink> {
  className?: string;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <NextLink
        className={cn('text-primary underline-offset-4 hover:underline', className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Link.displayName = 'Link';

export { Link };
