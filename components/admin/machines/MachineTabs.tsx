import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  adminTabsListClass,
  adminTabsTriggerClass,
} from '@/components/admin/styles';
import { InformationTab } from '@/components/admin/machines/InformationTab';
import { MachinesTab } from '@/components/admin/machines/MachinesTab';
import { WriteupsTab } from '@/components/admin/machines/WriteupsTab';

/**
 * /admin/machine-manage and /admin/machines/active/[id] rendered this same
 * three-tab body, down to the identical 350-character trigger className pasted
 * six times between them. Only where the game id comes from differs.
 */
export function MachineTabs({ gameId }: { gameId: string }) {
  const [activeTab, setActiveTab] = useState('information');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className={adminTabsListClass}>
        <TabsTrigger value="information" className={adminTabsTriggerClass}>
          Information
        </TabsTrigger>
        <TabsTrigger value="machines" className={adminTabsTriggerClass}>
          Machines
        </TabsTrigger>
        <TabsTrigger value="writeups" className={adminTabsTriggerClass}>
          Writeups
        </TabsTrigger>
      </TabsList>

      <TabsContent value="information" className="mt-6">
        <InformationTab gameId={gameId} />
      </TabsContent>
      <TabsContent value="machines" className="mt-6">
        <MachinesTab gameId={gameId} />
      </TabsContent>
      <TabsContent value="writeups" className="mt-6">
        <WriteupsTab gameId={gameId} />
      </TabsContent>
    </Tabs>
  );
}
