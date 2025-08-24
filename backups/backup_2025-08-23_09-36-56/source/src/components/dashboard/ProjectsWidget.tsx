import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, List, ListItem, ListItemText, Button, ListItemButton, Skeleton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Project, getActiveProjectsStream } from '../../api/projectApi';
import { Work as ProjectsIcon } from '@mui/icons-material';

const ProjectsWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = getActiveProjectsStream(currentUser.uid, 5, (data) => {
      setProjects(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom component="div">
          <ProjectsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Активные проекты
        </Typography>
        {loading ? (
          <>
            <Skeleton height={24} />
            <Skeleton height={24} />
            <Skeleton height={24} />
          </>
        ) : projects.length === 0 ? (
          <Typography color="text.secondary">Нет активных проектов.</Typography>
        ) : (
          <List dense>
            {projects.map((project) => (
              <ListItem key={project.id} disablePadding>
                <ListItemButton onClick={() => navigate(`/projects/${project.id}/estimates`)}>
                  <ListItemText
                    primary={project.name}
                    secondary={`до ${project.endDate || '...'}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        <Button size="small" onClick={() => navigate('/projects')} sx={{ mt: 1 }}>
          Все проекты
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProjectsWidget;
