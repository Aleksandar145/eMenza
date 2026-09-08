import type { CardStatus } from "@/lib/referent-cards-mock";
import { cardStatusLabels } from "@/lib/referent-cards-mock";

const statusClassName: Record<CardStatus, string> = {
  pending_verification: "bg-amber-500/12 text-amber-700",
  active: "bg-[#2f8f55]/12 text-[#2f8f55]",
  blocked: "bg-red-500/12 text-red-700",
  expired: "bg-black/8 text-black/55",
};

type CardStatusBadgeProps = {
  status: CardStatus;
  className?: string;
};

export function CardStatusBadge({ status, className = "" }: CardStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClassName[status]} ${className}`}
    >
      {cardStatusLabels[status]}
    </span>
  );
}

export default CardStatusBadge;
