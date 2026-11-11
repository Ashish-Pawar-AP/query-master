import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import { favoriteApi } from "./favoriteApi.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import DataTable from "../../components/common/DataTable.jsx";
import Badge from "../../components/common/Badge.jsx";
import FavoriteToggle from "../../components/common/FavoriteToggle.jsx";

export default function Favorites() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["favorites"], queryFn: () => favoriteApi.list().then((r) => r.data.data) });

  const removeMutation = useMutation({
    mutationFn: (id) => favoriteApi.remove(id),
    onSuccess: () => {
      toast.success("Removed from favorites");
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["submodules-browse"] });
    },
    onError: () => toast.error("Couldn't remove favorite"),
  });

  const columns = [
    { key: "name", label: "Query", render: (row) => <span className="font-medium text-slate-100">{row.name}</span> },
    { key: "queryType", label: "Type", render: (row) => <Badge tone="accent">{row.queryType}</Badge> },
    { key: "module", label: "Module", render: (row) => row.module?.name || "—" },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/submodules/${row._id}`)}>Open</Button>
          <FavoriteToggle
            isFavorite
            loading={removeMutation.isPending && removeMutation.variables === row._id}
            onToggle={() => removeMutation.mutate(row._id)}
            size="sm"
            showLabel={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Favorites" description="Queries you've bookmarked for quick access." />
      <DataTable columns={columns} rows={data} loading={isLoading} emptyTitle="No favorites yet" emptyDescription="Star a query to add it here." />
    </div>
  );
}
