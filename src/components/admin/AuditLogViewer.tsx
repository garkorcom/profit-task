/**
 * Audit Log Viewer - Интерфейс для просмотра audit logs
 * 
 * Функциональность:
 * - Поиск и фильтрация записей
 * - Экспорт в различных форматах  
 * - Генерация compliance отчетов
 * - Мониторинг security events
 * - Проверка целостности логов
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Badge,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Assignment as ReportIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import auditLogApi from '../../api/auditLogApi';
import {
  AuditLogEntry,
  AuditLogQuery,
  AuditLogSearchResult,
  AuditLogStats,
  AuditAction,
  AuditResource,
  AuditOutcome,
  AuditSeverity,
  ComplianceReportType,
  getSeverityColor,
  getOutcomeColor
} from '../../types/auditLog';

interface AuditLogViewerProps {}

const AuditLogViewer: React.FC<AuditLogViewerProps> = () => {
  // Состояние данных
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  
  // Состояние поиска и фильтров
  const [searchQuery, setSearchQuery] = useState<AuditLogQuery>({
    limit: 50,
    offset: 0,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
  
  // UI состояние
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [entryDialog, setEntryDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [complianceDialog, setComplianceDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Загрузка данных
  const loadData = async (query?: AuditLogQuery) => {
    setLoading(true);
    try {
      const searchResult = await auditLogApi.searchAuditLog(query || searchQuery);
      setEntries(searchResult.entries);
      setTotalCount(searchResult.totalCount);
    } catch (error) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики
  const loadStats = async () => {
    try {
      const auditStats = await auditLogApi.getAuditLogStats();
      setStats(auditStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Инициализация
  useEffect(() => {
    loadData();
    loadStats();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData();
      }, 30000); // Каждые 30 секунд
      setRefreshInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [autoRefresh]);

  // Обработчики поиска
  const handleSearch = () => {
    const newQuery = {
      ...searchQuery,
      offset: 0
    };
    setPage(0);
    setSearchQuery(newQuery);
    loadData(newQuery);
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
    const newQuery = {
      ...searchQuery,
      offset: newPage * rowsPerPage
    };
    setSearchQuery(newQuery);
    loadData(newQuery);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    const newQuery = {
      ...searchQuery,
      limit: newRowsPerPage,
      offset: 0
    };
    setSearchQuery(newQuery);
    loadData(newQuery);
  };

  // Обработчик экспорта
  const handleExport = async (format: 'JSON' | 'CSV' | 'PDF') => {
    try {
      const result = await auditLogApi.exportAuditLog({
        query: searchQuery,
        format,
        includeMetadata: true,
        includeHashes: true
      });
      
      // Открываем файл для скачивания
      window.open(result.downloadUrl, '_blank');
      setExportDialog(false);
    } catch (error) {
      console.error('Error exporting audit log:', error);
    }
  };

  // Генерация compliance отчета
  const handleComplianceReport = async (reportType: ComplianceReportType) => {
    try {
      const startDate = searchQuery.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = searchQuery.endDate || new Date();
      
      const report = await auditLogApi.generateComplianceReport(
        reportType,
        startDate,
        endDate,
        true
      );
      
      console.log('Compliance report generated:', report);
      setComplianceDialog(false);
    } catch (error) {
      console.error('Error generating compliance report:', error);
    }
  };

  // Проверка целостности
  const handleIntegrityCheck = async () => {
    try {
      setLoading(true);
      const result = await auditLogApi.performIntegrityCheck();
      console.log('Integrity check result:', result);
      
      if (result.result === 'PASSED') {
        alert('Проверка целостности пройдена успешно!');
      } else {
        alert(`Проверка целостности: ${result.result}. См. консоль для деталей.`);
      }
    } catch (error) {
      console.error('Error performing integrity check:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <ShieldIcon sx={{ mr: 2, fontSize: 40 }} />
          Журнал аудита
        </Typography>

        {/* Статистика */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Всего записей
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalEntries.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    За 24 часа
                  </Typography>
                  <Typography variant="h4">
                    {stats.entriesLast24h.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    События безопасности
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.securityEvents.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Состояние системы
                  </Typography>
                  <Chip 
                    label={stats.systemHealth}
                    color={
                      stats.systemHealth === 'HEALTHY' ? 'success' :
                      stats.systemHealth === 'WARNING' ? 'warning' : 'error'
                    }
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Панель управления */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Поиск по описанию, пользователю, IP..."
              value={searchQuery.searchText || ''}
              onChange={(e) => setSearchQuery(prev => ({ ...prev, searchText: e.target.value }))}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading}
            >
              Поиск
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Фильтры
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadData()}
              disabled={loading}
            >
              Обновить
            </Button>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label="Автообновление"
            />
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialog(true)}
            >
              Экспорт
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReportIcon />}
              onClick={() => setComplianceDialog(true)}
            >
              Compliance отчет
            </Button>
            <Button
              variant="outlined"
              startIcon={<SecurityIcon />}
              onClick={handleIntegrityCheck}
              disabled={loading}
            >
              Проверка целостности
            </Button>
          </Box>

          {/* Расширенные фильтры */}
          {filtersOpen && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Расширенные фильтры</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Действие</InputLabel>
                      <Select
                        multiple
                        value={searchQuery.actions || []}
                        onChange={(e) => setSearchQuery(prev => ({ 
                          ...prev, 
                          actions: e.target.value as AuditAction[] 
                        }))}
                      >
                        <MenuItem value="LOGIN_SUCCESS">Успешный вход</MenuItem>
                        <MenuItem value="LOGIN_FAILED">Неуспешный вход</MenuItem>
                        <MenuItem value="LOGOUT">Выход</MenuItem>
                        <MenuItem value="ACCESS_DENIED">Отказ в доступе</MenuItem>
                        <MenuItem value="ROLE_ASSIGNED">Назначение роли</MenuItem>
                        <MenuItem value="IMPERSONATION_STARTED">Начало импровизации</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Результат</InputLabel>
                      <Select
                        multiple
                        value={searchQuery.outcomes || []}
                        onChange={(e) => setSearchQuery(prev => ({ 
                          ...prev, 
                          outcomes: e.target.value as AuditOutcome[] 
                        }))}
                      >
                        <MenuItem value="SUCCESS">Успех</MenuItem>
                        <MenuItem value="FAILURE">Ошибка</MenuItem>
                        <MenuItem value="WARNING">Предупреждение</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Критичность</InputLabel>
                      <Select
                        multiple
                        value={searchQuery.severities || []}
                        onChange={(e) => setSearchQuery(prev => ({ 
                          ...prev, 
                          severities: e.target.value as AuditSeverity[] 
                        }))}
                      >
                        <MenuItem value="LOW">Низкая</MenuItem>
                        <MenuItem value="MEDIUM">Средняя</MenuItem>
                        <MenuItem value="HIGH">Высокая</MenuItem>
                        <MenuItem value="CRITICAL">Критичная</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <DatePicker
                      label="Дата с"
                      value={searchQuery.startDate || null}
                      onChange={(date) => setSearchQuery(prev => ({ 
                        ...prev, 
                        startDate: date || undefined 
                      }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <DatePicker
                      label="Дата по"
                      value={searchQuery.endDate || null}
                      onChange={(date) => setSearchQuery(prev => ({ 
                        ...prev, 
                        endDate: date || undefined 
                      }))}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="IP адрес"
                      value={searchQuery.ipAddress || ''}
                      onChange={(e) => setSearchQuery(prev => ({ 
                        ...prev, 
                        ipAddress: e.target.value || undefined 
                      }))}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
        </Paper>

        {/* Прогресс бар */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Таблица записей */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Время</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Действие</TableCell>
                <TableCell>Ресурс</TableCell>
                <TableCell>Результат</TableCell>
                <TableCell>Критичность</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.timestamp.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.userId || 'Система'}
                    </Typography>
                    {entry.impersonatedUserId && (
                      <Chip 
                        size="small" 
                        label={`Импровизация: ${entry.impersonatedUserId}`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.action.replace(/_/g, ' ')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.resource}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={entry.outcome}
                      sx={{ 
                        backgroundColor: getOutcomeColor(entry.outcome) + '20',
                        color: getOutcomeColor(entry.outcome)
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={entry.severity}
                      sx={{ 
                        backgroundColor: getSeverityColor(entry.severity) + '20',
                        color: getSeverityColor(entry.severity)
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.metadata.ipAddress || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedEntry(entry);
                        setEntryDialog(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
          />
        </TableContainer>

        {/* Диалог просмотра записи */}
        <Dialog 
          open={entryDialog} 
          onClose={() => setEntryDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Детали записи аудита</DialogTitle>
          <DialogContent>
            {selectedEntry && (
              <Box sx={{ pt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">ID записи</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {selectedEntry.id}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Время</Typography>
                    <Typography variant="body2">
                      {selectedEntry.timestamp.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Описание</Typography>
                    <Typography variant="body2">
                      {selectedEntry.details.description}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2">Источник</Typography>
                    <Typography variant="body2">
                      {selectedEntry.metadata.source}
                    </Typography>
                  </Grid>
                  {selectedEntry.details.reason && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Причина</Typography>
                      <Typography variant="body2">
                        {selectedEntry.details.reason}
                      </Typography>
                    </Grid>
                  )}
                  {selectedEntry.details.additionalData && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Дополнительные данные</Typography>
                      <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedEntry.details.additionalData, null, 2)}
                      </pre>
                    </Grid>
                  )}
                  {selectedEntry.hash && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Криптографический хэш</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '11px' }}>
                        {selectedEntry.hash}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEntryDialog(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог экспорта */}
        <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
          <DialogTitle>Экспорт audit log</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Выберите формат для экспорта текущих результатов поиска:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="outlined" 
                onClick={() => handleExport('JSON')}
                startIcon={<DownloadIcon />}
              >
                JSON формат
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleExport('CSV')}
                startIcon={<DownloadIcon />}
              >
                CSV формат
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleExport('PDF')}
                startIcon={<DownloadIcon />}
              >
                PDF отчет
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setExportDialog(false)}>Отмена</Button>
          </DialogActions>
        </Dialog>

        {/* Диалог compliance отчетов */}
        <Dialog open={complianceDialog} onClose={() => setComplianceDialog(false)}>
          <DialogTitle>Генерация Compliance отчета</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Выберите тип compliance отчета:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button 
                variant="outlined" 
                onClick={() => handleComplianceReport('SOX')}
                startIcon={<ReportIcon />}
              >
                SOX (Sarbanes-Oxley)
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleComplianceReport('GDPR')}
                startIcon={<ReportIcon />}
              >
                GDPR
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleComplianceReport('SOC2')}
                startIcon={<ReportIcon />}
              >
                SOC 2
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleComplianceReport('ISO27001')}
                startIcon={<ReportIcon />}
              >
                ISO 27001
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setComplianceDialog(false)}>Отмена</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default AuditLogViewer;