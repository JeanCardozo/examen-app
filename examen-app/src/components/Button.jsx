import classNames from "classnames";

export default function Button({
  children,
  onClick,
  variant = "primary", // 'primary' | 'secondary'
  className = "",
  ...props
}) {
  const base = "px-4 py-2 rounded-2xl shadow focus:outline-none focus:ring";
  const variants = {
    primary: "bg-primaryBlue text-white hover:bg-blue-700",
    secondary:
      "bg-white text-primaryBlue border border-primaryBlue hover:bg-gray-100",
  };
  return (
    <button
      onClick={onClick}
      className={classNames(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
