"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Mail, Phone, Calendar, MessageSquare, 
  ExternalLink, Trash2, CheckCheck, ChevronLeft, 
  ChevronRight, X, Download, Inbox, AlertCircle,
  TrendingUp, Eye
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { CrmApiService, PaginatedLeads } from "@/lib/api/crm";
import { ILead, ILeadStats } from "@nexora/shared-types";

export default function LeadsPage() {
  const { user } = useAuth();
  const businessId = user?.businesses?.[0]?.id;

  // ---- State ----
  const [leads, setLeads] = useState<ILead[]>([]);
  const [stats, setStats] = useState<ILeadStats>({ total: 0, unread: 0, thisWeek: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<ILead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const LIMIT = 15;

  // ---- Debounced search ----
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchQuery]);

  // ---- Fetch leads ----
  const fetchLeads = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res: PaginatedLeads = await CrmApiService.getLeads(businessId, page, LIMIT, debouncedSearch);
      setLeads(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  }, [businessId, page, debouncedSearch]);

  // ---- Fetch stats ----
  const fetchStats = useCallback(async () => {
    if (!businessId) return;
    try {
      const s = await CrmApiService.getLeadStats(businessId);
      setStats(s);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [businessId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ---- Actions ----
  const handleMarkAsRead = async (leadId: string) => {
    if (!businessId) return;
    try {
      await CrmApiService.markAsRead(businessId, leadId);
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, isRead: true } : l));
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!businessId) return;
    try {
      await CrmApiService.deleteLead(businessId, leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setTotal(prev => prev - 1);
      setDeleteConfirm(null);
      if (selectedLead?.id === leadId) setSelectedLead(null);
      fetchStats();
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Message", "Source", "Status", "Date"];
    const rows = leads.map(l => [
      l.name,
      l.email || "",
      l.phone || "",
      `"${l.message.replace(/"/g, '""')}"`,
      l.source,
      l.isRead ? "Read" : "Unread",
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage customer inquiries and messages from your website.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportCSV} disabled={leads.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time submissions</p>
          </CardContent>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-primary">{stats.unread}</span>
              {stats.unread > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Needs your attention</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{stats.thisWeek}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xs text-emerald-500 mt-1">New leads this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card className="glass flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or phone..." 
              className="pl-9 bg-background/50" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="leads-search"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {total} {total === 1 ? "lead" : "leads"}
          </span>
        </CardHeader>
        
        <CardContent className="p-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : leads.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {debouncedSearch ? "No leads match your search" : "No leads yet"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {debouncedSearch 
                  ? "Try a different search term to find leads."
                  : "When visitors submit contact forms or messages on your website, they'll appear here."
                }
              </p>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">Customer</th>
                    <th scope="col" className="px-6 py-4 font-medium">Message</th>
                    <th scope="col" className="px-6 py-4 font-medium">Source</th>
                    <th scope="col" className="px-6 py-4 font-medium">Date</th>
                    <th scope="col" className="px-6 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className={`border-b border-border/50 hover:bg-secondary/10 transition-colors group cursor-pointer ${!lead.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        setSelectedLead(lead);
                        if (!lead.isRead) handleMarkAsRead(lead.id);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!lead.isRead ? 'bg-primary animate-pulse' : 'bg-transparent'}`}></div>
                          <div>
                            <div className={`font-medium ${!lead.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>{lead.name}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {lead.email && (
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>
                              )}
                              {lead.phone && (
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className={`truncate ${!lead.isRead ? 'font-medium' : 'text-muted-foreground'}`}>{lead.message}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="font-normal bg-background/50">
                          {lead.source}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(lead.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          {!lead.isRead && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Mark as read"
                              onClick={() => handleMarkAsRead(lead.id)}
                              id={`mark-read-${lead.id}`}
                            >
                              <CheckCheck className="w-4 h-4 text-emerald-500" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="View details"
                            onClick={() => {
                              setSelectedLead(lead);
                              if (!lead.isRead) handleMarkAsRead(lead.id);
                            }}
                            id={`view-lead-${lead.id}`}
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {deleteConfirm === lead.id ? (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => handleDelete(lead.id)}
                              >
                                Confirm
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={() => setDeleteConfirm(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Delete"
                              onClick={() => setDeleteConfirm(lead.id)}
                              id={`delete-lead-${lead.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive/70" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage(p => p - 1)}
                id="leads-prev-page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages} 
                onClick={() => setPage(p => p + 1)}
                id="leads-next-page"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Lead Detail Slide-out Panel */}
      {selectedLead && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" 
            onClick={() => setSelectedLead(null)} 
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedLead.name}</h3>
                  <Badge variant={selectedLead.isRead ? "secondary" : "default"} className="text-xs mt-0.5">
                    {selectedLead.isRead ? "Read" : "Unread"}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedLead(null)} id="close-lead-detail">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h4>
                {selectedLead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${selectedLead.email}`} className="text-primary hover:underline">{selectedLead.email}</a>
                    </div>
                  </div>
                )}
                {selectedLead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a href={`tel:${selectedLead.phone}`} className="text-primary hover:underline">{selectedLead.phone}</a>
                    </div>
                  </div>
                )}
                {!selectedLead.email && !selectedLead.phone && (
                  <p className="text-sm text-muted-foreground italic">No contact details provided.</p>
                )}
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Message</h4>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedLead.message}</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Source</p>
                    <p className="text-sm font-medium mt-0.5">{selectedLead.source}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20">
                    <p className="text-xs text-muted-foreground">Received</p>
                    <p className="text-sm font-medium mt-0.5">{formatDate(selectedLead.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="p-6 border-t border-border flex items-center gap-3">
              {!selectedLead.isRead && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleMarkAsRead(selectedLead.id)}
                  id="detail-mark-read"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark as Read
                </Button>
              )}
              <Button 
                variant="destructive" 
                className={selectedLead.isRead ? "flex-1" : ""}
                onClick={() => {
                  handleDelete(selectedLead.id);
                  setSelectedLead(null);
                }}
                id="detail-delete-lead"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
