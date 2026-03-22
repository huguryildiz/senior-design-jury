import { TrashIcon } from "../../shared/Icons";
import Tooltip from "../../shared/Tooltip";

export default function DangerIconButton({
  ariaLabel,
  onClick,
  disabled = false,
  title,
  showLabel = false,
  danger = true,
  Icon = TrashIcon,
  label = "Delete",
}) {
  const button = (
    <button
      type="button"
      className={`manage-icon-btn${danger ? " danger" : ""}${showLabel ? " with-label" : ""}`}
      aria-label={ariaLabel || title}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon />
      {showLabel && <span className="manage-icon-btn-label">{label}</span>}
    </button>
  );

  if (title && !showLabel) {
    return <Tooltip text={title}>{button}</Tooltip>;
  }

  return button;
}
