import clsx from 'clsx';
import './Card.css';

export default function Card({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'default',
  hover = false,
  ...props 
}) {
  return (
    <div 
      className={clsx(
        'card', 
        `card-${variant}`, 
        `padding-${padding}`,
        { 'card-hover': hover },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', action }) {
  return (
    <div className={clsx('card-header', className)}>
      {children}
      {action && <div className="card-header-action">{action}</div>}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={clsx('card-title', className)}>{children}</h3>;
}

export function CardDescription({ children, className = '' }) {
  return <p className={clsx('card-description', className)}>{children}</p>;
}

export function CardContent({ children, className = '' }) {
  return <div className={clsx('card-content', className)}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return <div className={clsx('card-footer', className)}>{children}</div>;
}
