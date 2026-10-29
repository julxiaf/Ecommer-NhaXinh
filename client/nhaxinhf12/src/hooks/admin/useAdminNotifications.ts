import { useState, useMemo } from "react";
import type { AdminNotification } from "../../services/admin/types";
import { usePagination } from "../usePagination";

export type NotificationReadFilter = "all" | "unread" | "read";

interface UseAdminNotificationsParams {
  notifications: AdminNotification[];
  onCreateNotification: (notif: Partial<AdminNotification>) => void;
}

export function useAdminNotifications({
  notifications,
  onCreateNotification,
}: UseAdminNotificationsParams) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AdminNotification["type"]>("system");

  const filteredNotifications = useMemo(() => {
    const q = search.toLowerCase().trim();
    return notifications.filter((n) => {
      const matchType = typeFilter === "all" || n.type === typeFilter;
      const matchRead =
        readFilter === "all" ||
        (readFilter === "unread" && !n.read) ||
        (readFilter === "read" && Boolean(n.read));
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q);
      return matchType && matchRead && matchSearch;
    });
  }, [notifications, search, typeFilter, readFilter]);

  const pagination = usePagination(filteredNotifications, 8, [search, typeFilter, readFilter]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    onCreateNotification({
      title,
      message,
      type,
    });
    setTitle("");
    setMessage("");
    setShowModal(false);
  };

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    readFilter,
    setReadFilter,
    filteredNotifications,
    pagination,
    showModal,
    setShowModal,
    title,
    setTitle,
    message,
    setMessage,
    type,
    setType,
    handleSend,
  };
}

