"use client";

import { DesignMastersManager } from "@/components/designs/design-masters-manager";
import { DesignNumberForm } from "@/components/designs/design-number-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DesignsPageContent() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Designs</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Design numbers with stitches, areas, manufacturing companies, and
          fabric. Data is saved in localStorage for now.
        </p>
      </div>

      <Tabs defaultValue="design-numbers">
        <TabsList>
          <TabsTrigger value="design-numbers">Design numbers</TabsTrigger>
          <TabsTrigger value="masters">Masters</TabsTrigger>
        </TabsList>
        <TabsContent value="design-numbers" className="mt-6">
          <DesignNumberForm />
        </TabsContent>
        <TabsContent value="masters" className="mt-6">
          <DesignMastersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
