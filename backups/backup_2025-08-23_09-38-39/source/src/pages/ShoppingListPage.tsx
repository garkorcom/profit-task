import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Card, CardContent, Checkbox, List, ListItem, ListItemText, ListItemIcon, FormControl, InputLabel, Select, MenuItem, Chip, TextField, IconButton, Tooltip } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../auth/AuthContext';
import { getTasksStream, Task } from '../api/taskApi';
import { getProjectsStream, Project } from '../api/projectApi';
import { getShoppingChecksMap, setShoppingCheck } from '../api/shoppingApi';

const normalizeItem = (s: string) => s.trim().replace(/\s+/g, ' ');

const ShoppingListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [checks, setChecks] = useState<Record<string, { checked: boolean }>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    const unsubTasks = getTasksStream(currentUser.uid, (t) => setTasks(t));
    const unsubProjects = getProjectsStream(currentUser.uid, (p) => { setProjects(p); setLoading(false); });
    return () => { unsubTasks(); unsubProjects(); };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = getShoppingChecksMap(currentUser.uid, projectFilter || undefined, (map) => {
      const c: Record<string, { checked: boolean }> = {};
      Object.values(map).forEach(it => { c[it.id] = { checked: !!it.checked }; });
      setChecks(c);
    });
    return () => { unsub && unsub(); };
  }, [currentUser, projectFilter]);

  const items = useMemo(() => {
    const list: { key: string; text: string; projectId?: string; projectName?: string; count: number }[] = [];
    tasks.forEach(t => {
      if (projectFilter && t.projectId !== projectFilter) return;
      // whatToBuy field removed — skip extraction
    });
    return list.filter(i => i.text.toLowerCase().includes(search.toLowerCase()))
               .sort((a,b) => a.text.localeCompare(b.text));
  }, [tasks, projectFilter, search]);

  const exportCsv = () => {
    const header = ['Проект', 'Позиция', 'Отмечено', 'Встречается в задачах'];
    const rows = items.map(i => [projectFilter ? (projects.find(p => p.id === projectFilter)?.name || '') : (i.projectName || ''), i.text, checks[i.key]?.checked ? 'Да' : 'Нет', String(i.count)]);
    const csv = [header, ...rows].map(r => r.map(v => '"' + (v || '').toString().replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping_${projectFilter || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = async (key: string, text: string) => {
    if (!currentUser) return;
    const checked = !checks[key]?.checked;
    setChecks(prev => ({ ...prev, [key]: { checked } }));
    await setShoppingCheck(currentUser.uid, key, { itemText: text, projectId: projectFilter || undefined, checked, updatedAt: new Date() });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Список покупок</Typography>
        <Tooltip title="Экспорт CSV">
          <IconButton onClick={exportCsv} aria-label="export-csv">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box display="flex" gap={2} mb={2} flexWrap="wrap">
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel>Проект</InputLabel>
          <Select value={projectFilter} label="Проект" onChange={(e) => setProjectFilter(e.target.value)}>
            <MenuItem value="">Все проекты</MenuItem>
            {projects.map(p => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
          </Select>
        </FormControl>
        <TextField placeholder="Поиск по позициям..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flexGrow: 1, minWidth: 220 }} />
        <Chip label={`Позиций: ${items.length}`} />
      </Box>

      {items.length === 0 ? (
        <Card><CardContent><Typography color="text.secondary" align="center">Нет позиций для списка покупок</Typography></CardContent></Card>
      ) : (
        <Card>
          <CardContent>
            <List dense sx={{
              // мобильный компактный вид: меньше отступы
              '& .MuiListItem-root': { py: 0.25 },
              '& .MuiListItemText-primary': { fontSize: { xs: '0.95rem', sm: '1rem' } },
            }}>
              {items.map(item => (
                <ListItem key={item.key} disableGutters secondaryAction={item.projectName && <Chip size="small" label={item.projectName} />}>
                  <ListItemIcon>
                    <Checkbox edge="start" checked={!!checks[item.key]?.checked} onChange={() => toggle(item.key, item.text)} />
                  </ListItemIcon>
                  <ListItemText primary={item.text} secondary={item.count > 1 ? `встречается в задачах: ${item.count}` : undefined} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ShoppingListPage;


