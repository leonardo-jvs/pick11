"use client";

import { useState } from "react";
import { Users, Play, ShieldCheck } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Tag, PositionBadge, OverallBadge, StatusDot } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { Timer } from "@/components/ui/Timer";
import { Modal } from "@/components/ui/Modal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { toast } from "@/store/toastStore";

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <Screen withField>
      <h1 className="mb-1 font-display text-4xl tracking-wide text-text-primary">Design System</h1>
      <p className="mb-8 font-sans text-sm text-text-secondary">Etapa 1 — componentes base do Pick11</p>

      {/* Buttons */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Button</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Estou pronto</Button>
          <Button variant="secondary">Entrar na sala</Button>
          <Button variant="ghost">Como jogar</Button>
          <Button variant="danger">Abandonar</Button>
          <Button variant="primary" isLoading>
            Gerando
          </Button>
          <Button variant="primary" icon={<Play size={16} />}>
            Simular
          </Button>
        </div>
      </Card>

      {/* Badges */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Badges &amp; Tags</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <PositionBadge position="ATA" />
          <PositionBadge position="MEI" />
          <PositionBadge position="ZAG" />
          <PositionBadge position="GOL" />
          <Tag>Posse</Tag>
          <Tag>Contra-ataque</Tag>
          <div className="flex items-center gap-1">
            <StatusDot status="ready" />
            <span className="font-sans text-xs text-text-secondary">Pronto</span>
          </div>
          <div className="flex items-center gap-1">
            <StatusDot status="waiting" />
            <span className="font-sans text-xs text-text-secondary">Aguardando</span>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-6">
          <OverallBadge overallFinal={84} delta={2} size="lg" />
          <OverallBadge overallFinal={84} delta={0} size="lg" />
          <OverallBadge overallFinal={84} delta={-2} size="lg" />
        </div>
      </Card>

      {/* Star rating */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Compatibilidade</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2">
          <StarRating value={5} />
          <StarRating value={3} />
          <StarRating value={1} />
        </div>
      </Card>

      {/* Player card example */}
      <Card interactive selected className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PositionBadge position="ATA" />
            <CardTitle>Kylian Mbappé</CardTitle>
          </div>
          <OverallBadge overallFinal={91} delta={1} />
        </CardHeader>
        <p className="mb-3 font-sans text-xs text-text-tertiary">Real Madrid</p>
        <div className="mb-3 flex flex-wrap gap-2">
          <Tag>Contra-ataque</Tag>
          <Tag>Finalizador</Tag>
        </div>
        <StarRating value={4} />
      </Card>

      {/* Timer */}
      <Card className="mb-6 flex flex-col items-center gap-4">
        <CardTitle>Timer</CardTitle>
        <Timer seconds={15} resetKey={resetKey} label="segundos" />
        <Button variant="secondary" size="sm" onClick={() => setResetKey((k) => k + 1)}>
          Reiniciar
        </Button>
      </Card>

      {/* Modal / BottomSheet / Toast triggers */}
      <Card className="mb-6 flex flex-wrap gap-3">
        <Button variant="secondary" icon={<ShieldCheck size={16} />} onClick={() => setModalOpen(true)}>
          Abrir Modal
        </Button>
        <Button variant="secondary" icon={<Users size={16} />} onClick={() => setSheetOpen(true)}>
          Abrir BottomSheet
        </Button>
        <Button variant="secondary" onClick={() => toast.info("João ficou pronto")}>
          Toast info
        </Button>
        <Button variant="secondary" onClick={() => toast.urgent("Sua vez chegou")}>
          Toast urgente
        </Button>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Abandonar sala?">
        <p className="mb-5 font-sans text-sm text-text-secondary">
          Você vai perder o progresso do draft. Essa ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" fullWidth onClick={() => setModalOpen(false)}>
            Abandonar
          </Button>
        </div>
      </Modal>

      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Escolher formação">
        <div className="grid grid-cols-3 gap-2">
          {["4-3-3", "4-4-2"].map((f) => (
            <button
              key={f}
              onClick={() => setSheetOpen(false)}
              className="rounded-card border border-border-subtle bg-surface py-3 font-mono text-sm text-text-primary transition-colors hover:border-gold hover:text-gold"
            >
              {f}
            </button>
          ))}
        </div>
      </BottomSheet>
    </Screen>
  );
}
