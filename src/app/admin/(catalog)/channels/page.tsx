import { Suspense } from "react";

import { ChannelsTable } from "~/components/admin/channel";
import { ChannelsPageSkeleton } from "~/components/admin/channel/channels-page-skeleton";
import { api } from "~/trpc/server";

async function ChannelsContent() {
  const channels = await api.channels.getAllChannels();

  const totalChannels = channels.length;
  const totalNotifications = channels.reduce(
    (acc, channel) => acc + (channel._count?.notifications ?? 0),
    0,
  );
  const uniqueTypes = new Set(channels.map((channel) => channel.type)).size;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Canales</h1>
        <p className="text-muted-foreground">
          Configura los canales disponibles para enviar notificaciones a los usuarios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalChannels}</div>
          <div className="text-muted-foreground text-sm">Total de canales</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{totalNotifications}</div>
          <div className="text-muted-foreground text-sm">Notificaciones enviadas</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="font-bold text-2xl">{uniqueTypes}</div>
          <div className="text-muted-foreground text-sm">Tipos de canal</div>
        </div>
      </div>

      <ChannelsTable channels={channels} />
    </div>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense fallback={<ChannelsPageSkeleton />}>
      <ChannelsContent />
    </Suspense>
  );
}
