import Link from "next/link";
import { SIDEBAR_GROUPS } from "./sidebarGroups";
import { signOutAction } from "../../lib/auth/actions";

export function Sidebar({ staffEmail }: { staffEmail: string }) {
  return (
    <aside className="crm-sidebar">
      <div className="crm-sidebar__brand">CRM TPL</div>
      <nav className="crm-sidebar__nav">
        {SIDEBAR_GROUPS.map((group) => (
          <div className="crm-sidebar__group" key={group.label}>
            <div className="crm-sidebar__label">{group.label}</div>
            {group.items.map((item) =>
              item.href ? (
                <Link key={item.id} href={item.href} className="crm-sidebar__link">
                  {item.label}
                </Link>
              ) : (
                <span key={item.id} className="crm-sidebar__link crm-sidebar__link--disabled">
                  {item.label}
                  <span className="crm-sidebar__soon">Próximamente</span>
                </span>
              ),
            )}
          </div>
        ))}
      </nav>
      <div className="crm-sidebar__foot">
        <div>
          <div className="crm-sidebar__staff-name">{staffEmail}</div>
          <div className="crm-sidebar__staff-role">Staff TPL</div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="crm-btn crm-btn--ghost">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
