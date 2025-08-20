import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Chip, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Task, getHighPriorityTasksStream } from '../../api/taskApi';
import { ListAlt as TasksIcon } from '@mui/icons-material';

const TasksWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = getHighPriorityTasksStream(currentUser.uid, 5, (data) => {
      setTasks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom component="div">
          <TasksIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Важные задачи
        </Typography>
        {loading ? (
          <Typography>Загрузка...</Typography>
        ) : tasks.length === 0 ? (
          <Typography color="text.secondary">Нет задач с высоким приоритетом.</Typography>
        ) : (
          <List dense>
            {tasks.map((task) => (
              <ListItem key={task.id} disablePadding>
                <ListItemText
                  primary={task.task}
                  secondary={
                    <>
                      {task.projectName && <Chip label={task.projectName} size="small" sx={{ mr: 1 }} />}
                      {task.contractorName}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        <Button size="small" onClick={() => navigate('/tasks')} sx={{ mt: 1 }}>
          Все задачи
        </Button>
      </CardContent>
    </Card>
  );
};

export default TasksWidget;
