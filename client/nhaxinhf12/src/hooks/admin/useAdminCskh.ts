import { useState, useMemo } from "react";
import type { AdminTicket } from "../../services/admin/types";
import { usePagination } from "../usePagination";

export type TicketStatusFilter = "all" | "open" | "in_progress" | "resolved";

interface UseAdminCskhParams {
  tickets: AdminTicket[];
  onReplyTicket: (id: string, replyText: string) => void;
}

export function useAdminCskh({ tickets, onReplyTicket }: UseAdminCskhParams) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatusFilter>("all");
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  const filteredTickets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickets.filter((t) => {
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      const matchSearch =
        !q ||
        t.customerName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.phone.includes(q);
      return matchStatus && matchSearch;
    });
  }, [tickets, search, statusFilter]);

  const pagination = usePagination(filteredTickets, 8, [search, statusFilter]);

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    onReplyTicket(selectedTicket.id, replyText);
    setSelectedTicket({
      ...selectedTicket,
      status: "resolved",
      reply: replyText,
    });
    setReplyText("");
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredTickets,
    pagination,
    selectedTicket,
    setSelectedTicket,
    replyText,
    setReplyText,
    handleSendReply,
  };
}

