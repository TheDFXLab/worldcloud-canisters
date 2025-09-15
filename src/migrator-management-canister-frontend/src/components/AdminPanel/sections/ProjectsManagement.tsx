import React, { useEffect, useMemo, useState } from "react";
import { useAdminLogic } from "../../../hooks/useAdminLogic";
import { useToaster } from "../../../context/ToasterContext/ToasterContext";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Pagination,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { MoreVert, Refresh, Visibility, RestartAlt } from "@mui/icons-material";

const ProjectsManagement: React.FC = () => {
  const {
    allProjects,
    isLoadingAllProjects,
    refreshProjectsAll,
    handleResetProjectSlot,
  } = useAdminLogic();
  const { setToasterData, setShowToaster } = useToaster();

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // load projects on mount and page change
  useEffect(() => {
    const payload = { page: page - 1, limit };
    refreshProjectsAll(payload);
  }, [page, limit, refreshProjectsAll]);

  const projects = useMemo(() => {
    // allProjects is [id, project][]
    return allProjects.map((pair) => (Array.isArray(pair) ? pair[1] : pair));
  }, [allProjects]);

  const handleRowClick = (project: any) => {
    setSelectedProject(project);
    setDetailsOpen(true);
  };

  const handleResetSlot = async (projectId: number) => {
    setIsResetting(true);
    try {
      const result = await handleResetProjectSlot(projectId);
      setToasterData({
        headerContent: result.status ? "Success" : "Error",
        toastStatus: result.status,
        toastData: result.message,
        textColor: result.status ? "green" : "red",
        timeout: 3000,
      });
      setShowToaster(true);
      // Refresh page
      const payload = { page: page - 1, limit };
      refreshProjectsAll(payload);
    } catch (e: any) {
      setToasterData({
        headerContent: "Error",
        toastStatus: false,
        toastData: e?.message || "Failed to reset project slot",
        textColor: "red",
        timeout: 3000,
      });
      setShowToaster(true);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="projects-management">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Projects Management
        </Typography>
        <Typography variant="body1">
          Browse projects and perform administrative actions
        </Typography>
      </Box>

      <Card
        sx={{
          background: "var(--background-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-color)",
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">All Projects</Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => refreshProjectsAll({ page: page - 1, limit })}
            >
              Refresh
            </Button>
          </Box>

          {isLoadingAllProjects ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <Typography variant="body2">Loading...</Typography>
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2">No projects found.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer
                component={Paper}
                sx={{
                  background: "var(--background-primary)",
                  color: "var(--text-primary)",
                }}
              >
                <Table
                  sx={{ "& td, & th": { borderColor: "var(--border-color)" } }}
                >
                  <TableHead sx={{ background: "var(--background-secondary)" }}>
                    <TableRow>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        ID
                      </TableCell>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        Name
                      </TableCell>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        User
                      </TableCell>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        Plan
                      </TableCell>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        Canister
                      </TableCell>
                      <TableCell sx={{ color: "var(--text-primary)" }}>
                        Date Created
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: "var(--text-primary)" }}
                      >
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((project: any, index: number) => (
                      <TableRow
                        key={`${project.id}-${index}`}
                        hover
                        onClick={() => handleRowClick(project)}
                        sx={{
                          cursor: "pointer",
                          "&:hover": { background: "var(--background-hover)" },
                        }}
                      >
                        <TableCell sx={{ color: "var(--text-primary)" }}>
                          {project.id}
                        </TableCell>
                        <TableCell sx={{ color: "var(--text-primary)" }}>
                          {project.name}
                        </TableCell>
                        <TableCell sx={{ color: "var(--text-primary)" }}>
                          {project.user}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={project.plan}
                            size="small"
                            color={
                              project.plan === "paid" ? "success" : "default"
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ color: "var(--text-primary)" }}>
                          {project.canister_id || "N/A"}
                        </TableCell>
                        <TableCell sx={{ color: "var(--text-primary)" }}>
                          {new Date(project.date_created).toLocaleString()}
                        </TableCell>
                        <TableCell
                          align="right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip title="View details">
                            <IconButton onClick={() => handleRowClick(project)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reset Project Slot">
                            <span>
                              <IconButton
                                onClick={() => handleResetSlot(project.id)}
                                disabled={isResetting}
                              >
                                <RestartAlt />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={page + 1} // unknown total; allow forward navigation optimistically
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: "var(--background-primary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            },
          },
        }}
      >
        <DialogTitle sx={{ color: "var(--text-primary)" }}>
          Project Details
        </DialogTitle>
        <DialogContent sx={{ color: "var(--text-primary)" }}>
          {selectedProject && (
            <Box
              sx={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 1 }}
            >
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                ID
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {selectedProject.id}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                Name
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {selectedProject.name}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                User
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {selectedProject.user}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                Plan
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {selectedProject.plan}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                Canister
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {selectedProject.canister_id || "N/A"}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                Created
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {new Date(selectedProject.date_created).toLocaleString()}
              </Typography>

              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                Updated
              </Typography>
              <Typography variant="body2" sx={{ color: "var(--text-primary)" }}>
                {new Date(selectedProject.date_updated).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedProject && (
            <Button
              startIcon={<RestartAlt />}
              color="warning"
              onClick={() => handleResetSlot(selectedProject.id)}
              disabled={isResetting}
            >
              {isResetting ? "Resetting..." : "Reset Project Slot"}
            </Button>
          )}
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ProjectsManagement;
