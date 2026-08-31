import React from 'react'

const buttonVariantStyles = {
  primary: 'bg-primary-container text-on-primary-container hover:bg-primary shadow-sm',
  secondary: 'bg-surface-container-low text-on-surface border border-outline-variant hover:bg-surface-container-high',
  tertiary: 'bg-transparent text-primary hover:bg-primary/10',
  danger: 'bg-error text-on-error hover:bg-error/90',
  success: 'bg-secondary text-on-secondary hover:bg-secondary/90'
}

const buttonSizeStyles = {
  sm: 'px-3 py-2 text-label-sm',
  md: 'px-6 py-3',
  lg: 'px-8 py-4'
}

export function PrimaryButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...rest
}) {
  const componentClassName = [
    'font-label-md text-label-md font-bold rounded-lg transition-all duration-150 active:scale-95',
    'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
    buttonVariantStyles[variant] || buttonVariantStyles.primary,
    buttonSizeStyles[size] || buttonSizeStyles.md,
    className
  ].join(' ')

  return (
    <button className={componentClassName} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}

export { PrimaryButton as Button }
