import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip
} from '@mui/material';
import {
  CompareArrows as CompareIcon,
  Restore as RestoreIcon,
  Info as InfoIcon,
  Add as AddIcon,
  CheckCircle as ApprovedIcon,
  Schedule as DraftIcon,
  Send as SentIcon
} from '@mui/icons-material';
import { EstimateItem } from '../../api/estimateApi';

export interface EstimateVersion {
  id: string;
  version: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt: Date;
  createdBy: string;
  notes: string;
  items: EstimateItem[];
  subtotal: number;
  total: number;
  taxRate?: number;
  discountRate?: number;
  changes?: {
    added: number;
    modified: number;
    removed: number;
  };
}

interface EstimateVersionManagerProps {
  open: boolean;
  onClose: () => void;
  currentVersion: EstimateVersion;
  versions: EstimateVersion[];
  onCreateVersion: (notes: string) => void;
  onRestoreVersion: (version: EstimateVersion) => void;
  onCompareVersions?: (version1: EstimateVersion, version2: EstimateVersion) => void;
}

export const EstimateVersionManager: React.FC<EstimateVersionManagerProps> = ({
  open,
  onClose,
  currentVersion,
  versions,
  onCreateVersion,
  onRestoreVersion,
  onCompareVersions
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedVersions, setSelectedVersions] = useState<[string?, string?]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [compareMode, setCompareMode] = useState(false);

  // Сортируем версии по дате создания (новые первыми)
  const sortedVersions = [...versions].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'sent':
        return <SentIcon color="primary" />;
      case 'draft':
      default:
        return <DraftIcon color="action" />;
    }
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'sent':
        return 'primary';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleCreateVersion = () => {
    onCreateVersion(versionNotes);
    setCreateDialogOpen(false);
    setVersionNotes('');
  };

  const handleVersionSelect = (versionId: string) => {
    if (!compareMode) return;
    
    const [first, second] = selectedVersions;
    if (first === versionId) {
      setSelectedVersions([undefined, second]);
    } else if (second === versionId) {
      setSelectedVersions([first, undefined]);
    } else if (!first) {
      setSelectedVersions([versionId, second]);
    } else if (!second) {
      setSelectedVersions([first, versionId]);
    } else {
      setSelectedVersions([versionId, undefined]);
    }
  };

  const compareVersions = () => {
    const [v1Id, v2Id] = selectedVersions;
    if (v1Id && v2Id && onCompareVersions) {
      const version1 = versions.find(v => v.id === v1Id);
      const version2 = versions.find(v => v.id === v2Id);
      if (version1 && version2) {
        onCompareVersions(version1, version2);
      }
    }
  };

  const calculateChanges = (version: EstimateVersion, previousVersion?: EstimateVersion) => {
    if (!previousVersion) {
      return {
        added: version.items.length,
        modified: 0,
        removed: 0
      };
    }

    const prevItemsMap = new Map(previousVersion.items.map(item => [item.id, item]));
    const currItemsMap = new Map(version.items.map(item => [item.id, item]));

    let added = 0;
    let modified = 0;
    let removed = 0;

    // Проверяем добавленные и измененные элементы
    currItemsMap.forEach((item, id) => {
      const prevItem = prevItemsMap.get(id);
      if (!prevItem) {
        added++;
      } else if (JSON.stringify(item) !== JSON.stringify(prevItem)) {
        modified++;
      }
    });

    // Проверяем удаленные элементы
    prevItemsMap.forEach((item, id) => {
      if (!currItemsMap.has(id)) {
        removed++;
      }
    });

    return { added, modified, removed };
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">История версий</Typography>
            <Box display="flex" gap={1}>
              <Button
                variant={compareMode ? 'contained' : 'outlined'}
                startIcon={<CompareIcon />}
                onClick={() => {
                  setCompareMode(!compareMode);
                  setSelectedVersions([]);
                }}
                size="small"
              >
                {compareMode ? 'Отменить сравнение' : 'Сравнить версии'}
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                size="small"
              >
                Создать версию
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Хронология" />
            <Tab label="Список" />
            <Tab label="Изменения" />
          </Tabs>

          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Для показа графической хронологии требуется пакет @mui/lab. 
                Сейчас показан упрощенный список.
              </Alert>
              <Grid container spacing={2}>
                {sortedVersions.map((version, index) => {
                  const previousVersion = sortedVersions[index + 1];
                  const changes = calculateChanges(version, previousVersion);
                  const isSelected = selectedVersions.includes(version.id);
                  const isCurrent = version.id === currentVersion.id;
                  return (
                    <Grid key={version.id} size={{ xs: 12, md: 6 }}>
                      <Card
                        sx={{
                          border: isSelected ? '2px solid #1976d2' : undefined,
                          cursor: compareMode ? 'pointer' : 'default'
                        }}
                        onClick={() => compareMode && handleVersionSelect(version.id)}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="start">
                            <Box>
                              <Typography variant="h6">
                                Версия {version.version}
                                {isCurrent && (
                                  <Chip label="Текущая" size="small" color="primary" sx={{ ml: 1 }} />
                                )}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {version.createdBy}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} mt={1}>
                                {getStatusIcon(version.status)}
                                <Chip 
                                  label={version.status} 
                                  size="small" 
                                  color={getStatusColor(version.status)}
                                />
                              </Box>
                              {version.notes && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  {version.notes}
                                </Typography>
                              )}
                              <Box display="flex" gap={1} mt={1}>
                                {changes.added > 0 && (
                                  <Chip label={`+${changes.added}`} size="small" color="success" variant="outlined" />
                                )}
                                {changes.modified > 0 && (
                                  <Chip label={`~${changes.modified}`} size="small" color="warning" variant="outlined" />
                                )}
                                {changes.removed > 0 && (
                                  <Chip label={`-${changes.removed}`} size="small" color="error" variant="outlined" />
                                )}
                              </Box>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="h6" color="primary">
                                {version.total.toFixed(2)} ₽
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {compareMode && <TableCell padding="checkbox">Выбрать</TableCell>}
                    <TableCell>Версия</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Дата создания</TableCell>
                    <TableCell>Автор</TableCell>
                    <TableCell>Изменения</TableCell>
                    <TableCell align="right">Сумма</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedVersions.map((version, index) => {
                    const previousVersion = sortedVersions[index + 1];
                    const changes = calculateChanges(version, previousVersion);
                    const isSelected = selectedVersions.includes(version.id);
                    
                    return (
                      <TableRow 
                        key={version.id}
                        selected={isSelected}
                        onClick={() => compareMode && handleVersionSelect(version.id)}
                        sx={{ cursor: compareMode ? 'pointer' : 'default' }}
                      >
                        {compareMode && (
                          <TableCell padding="checkbox">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              readOnly
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {version.version}
                            {version.id === currentVersion.id && (
                              <Chip label="Текущая" size="small" color="primary" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={version.status} 
                            size="small" 
                            color={getStatusColor(version.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(version.createdAt).toLocaleString('ru-RU')}
                        </TableCell>
                        <TableCell>{version.createdBy}</TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            {changes.added > 0 && (
                              <Chip label={`+${changes.added}`} size="small" color="success" variant="outlined" />
                            )}
                            {changes.modified > 0 && (
                              <Chip label={`~${changes.modified}`} size="small" color="warning" variant="outlined" />
                            )}
                            {changes.removed > 0 && (
                              <Chip label={`-${changes.removed}`} size="small" color="error" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" fontWeight="bold">
                            {version.total.toFixed(2)} ₽
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {version.id !== currentVersion.id && (
                            <Tooltip title="Восстановить эту версию">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRestoreVersion(version);
                                }}
                              >
                                <RestoreIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Информация">
                            <IconButton size="small">
                              <InfoIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Детальное сравнение изменений между версиями
              </Alert>
              {sortedVersions.slice(0, -1).map((version, index) => {
                const previousVersion = sortedVersions[index + 1];
                const changes = calculateChanges(version, previousVersion);
                return (
                  <Card key={version.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {version.version} ← {previousVersion.version}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid size={4}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="success.main">
                              +{changes.added}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Добавлено
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="warning.main">
                              ~{changes.modified}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Изменено
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid size={4}>
                          <Box textAlign="center">
                            <Typography variant="h4" color="error.main">
                              -{changes.removed}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Удалено
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Divider sx={{ my: 2 }} />
                      <Box display="flex" justifyContent="space-between">
                        <Typography>Изменение суммы:</Typography>
                        <Typography 
                          color={version.total > previousVersion.total ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {version.total > previousVersion.total ? '+' : ''}
                          {(version.total - previousVersion.total).toFixed(2)} ₽
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}

          {compareMode && selectedVersions.filter(v => v).length === 2 && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="body2" color="white" gutterBottom>
                Выбрано 2 версии для сравнения
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CompareIcon />}
                onClick={compareVersions}
              >
                Сравнить выбранные версии
              </Button>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания новой версии */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать новую версию</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Будет создана новая версия на основе текущего состояния эстимейта
          </Alert>
          <TextField
            label="Примечания к версии"
            value={versionNotes}
            onChange={(e) => setVersionNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Опишите изменения в этой версии..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateVersion} 
            variant="contained"
            disabled={!versionNotes.trim()}
          >
            Создать версию
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
