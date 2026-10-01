// Placeholder de carga de una tarjeta. Usa las clases `.notif-card--skeleton`
// / `.notif-icon--skeleton` / `.skel-line--*` de `pages/Notificaciones.css`,
// que el centro de notificaciones del staff también importa.
export default function NotifSkeleton() {
  return (
    <div className="notif-card notif-card--skeleton">
      <div className="notif-icon notif-icon--skeleton" />
      <div className="notif-card__body">
        <div className="skel-line skel-line--sm" />
        <div className="skel-line skel-line--md" />
      </div>
    </div>
  )
}