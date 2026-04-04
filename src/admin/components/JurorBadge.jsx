// src/admin/components/JurorBadge.jsx
// Shared juror identity badge — avatar + name + affiliation.
// Used across all admin pages for consistent juror rendering.

import { stripTitles, jurorInitials, jurorAvatarBg, jurorAvatarFg } from "../utils/jurorIdentity";

/**
 * @param {object}  props
 * @param {string}  props.name         - Full juror name (titles stripped automatically)
 * @param {string}  [props.affiliation] - Department / institution
 * @param {string}  [props.avatarUrl]  - URL to juror photo (optional)
 * @param {"sm"|"md"|"lg"} [props.size="md"] - Size variant
 * @param {boolean} [props.nameOnly]   - Only show name, no affiliation
 * @param {object}  [props.style]      - Extra container style
 * @param {string}  [props.className]  - Extra container class
 */
export default function JurorBadge({
  name,
  affiliation,
  avatarUrl,
  size = "md",
  nameOnly = false,
  style,
  className,
}) {
  const displayName = stripTitles(name);
  const ini = jurorInitials(name);
  const bg = jurorAvatarBg(name);
  const fg = jurorAvatarFg(name);

  const sizes = {
    sm: { avatar: 22, fontSize: 8, nameSize: 12, instSize: 10, gap: 6 },
    md: { avatar: 28, fontSize: 10, nameSize: 13, instSize: 11, gap: 8 },
    lg: { avatar: 34, fontSize: 12, nameSize: 14, instSize: 11, gap: 10 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      className={`jb-badge${className ? ` ${className}` : ""}`}
      style={{ display: "flex", alignItems: "center", gap: s.gap, minWidth: 0, ...style }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className="jb-avatar"
          style={{
            width: s.avatar, height: s.avatar, borderRadius: "50%",
            objectFit: "cover", flexShrink: 0,
          }}
        />
      ) : (
        <div
          className="jb-avatar"
          style={{
            width: s.avatar, height: s.avatar, borderRadius: "50%",
            background: bg, color: fg,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: s.fontSize, fontWeight: 700, letterSpacing: "-0.3px",
            flexShrink: 0, lineHeight: 1,
          }}
        >
          {ini}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          className="jb-name"
          style={{
            fontWeight: 600, fontSize: s.nameSize, lineHeight: 1.3,
          }}
        >
          {displayName}
        </div>
        {!nameOnly && affiliation && (
          <div
            className="jb-affiliation"
            style={{
              fontSize: s.instSize, color: "var(--text-tertiary)", lineHeight: 1.3,
            }}
          >
            {affiliation}
          </div>
        )}
      </div>
    </div>
  );
}
