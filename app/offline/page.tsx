import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="pageShell stackLg offlinePage">
      <section className="panel stackMd offlineCard">
        <p className="eyebrow">Sin conexión</p>
        <h1>Esta pantalla no pudo cargarse ahora mismo.</h1>
        <p className="leadText">
          Si ya abriste la obra antes, vuelve desde el listado o desde la app instalada y se usará la versión
          guardada en este dispositivo.
        </p>

        <div className="buttonRow">
          <Link className="button primary" href="/">
            Ir a inicio
          </Link>
          <Link className="button secondary" href="/obras">
            Ver obras
          </Link>
        </div>
      </section>
    </main>
  );
}
