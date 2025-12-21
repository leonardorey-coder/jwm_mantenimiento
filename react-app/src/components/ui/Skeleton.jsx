import clsx from 'clsx';
import './Skeleton.css';

export function Skeleton({ className, variant = 'text', width, height }) {
  return (
    <div 
      className={clsx('skeleton', `skeleton-${variant}`, className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card-header">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="skeleton-card-title">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
      <div className="skeleton-card-footer">
        <Skeleton width="30%" height={14} />
        <Skeleton width="20%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} height={16} />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="skeleton-table-row">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} height={14} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton variant="circular" width={36} height={36} />
          <div className="skeleton-list-content">
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
