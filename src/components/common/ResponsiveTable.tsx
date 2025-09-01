import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  TablePagination,
  Divider,
  Avatar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';

export interface ResponsiveTableColumn<T extends Record<string, any> = any> {
  id: keyof T | string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  hideOnMobile?: boolean;
  mobileLabel?: string; // Для отображения в мобильном режиме
  mobileRender?: (value: any, row: T) => React.ReactNode; // Специальный рендер для мобильного
}

export interface ResponsiveTableProps<T extends Record<string, any> = any> {
  columns: ResponsiveTableColumn<T>[];
  data: T[];
  keyField?: keyof T;
  title?: string;
  loading?: boolean;
  pagination?: {
    page: number;
    rowsPerPage: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
    rowsPerPageOptions?: number[];
  };
  onRowClick?: (row: T, index: number) => void;
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  maxHeight?: number;
  dense?: boolean;
}

const ResponsiveTable = <T extends Record<string, any>,>({
  columns,
  data,
  keyField = 'id' as keyof T,
  title,
  loading = false,
  pagination,
  onRowClick,
  mobileCardRender,
  emptyMessage = 'Нет данных для отображения',
  maxHeight,
  dense = false
}: ResponsiveTableProps<T>) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isVerySmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());

  const toggleRowExpansion = (rowKey: string | number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  const getRowKey = (row: T, index: number): string | number => {
    if (keyField in row) {
      return String(row[keyField]);
    }
    return index;
  };

  const handleRowClick = (row: T, index: number, event: React.MouseEvent) => {
    // Prevent triggering row click when clicking expand button
    if ((event.target as Element).closest('.expand-button')) {
      return;
    }
    onRowClick?.(row, index);
  };

  const MobileCard = ({ row, index }: { row: T; index: number }) => {
    const rowKey = getRowKey(row, index);
    const isExpanded = expandedRows.has(rowKey);
    const primaryColumns = columns.filter(col => !col.hideOnMobile);
    const secondaryColumns = columns.filter(col => col.hideOnMobile);

    if (mobileCardRender) {
      return (
        <Card
          sx={{
            mb: 1,
            cursor: onRowClick ? 'pointer' : 'default',
            '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {},
          }}
          onClick={(e) => handleRowClick(row, index, e)}
        >
          {mobileCardRender(row, index)}
        </Card>
      );
    }

    return (
      <Card
        sx={{
          mb: 1,
          cursor: onRowClick ? 'pointer' : 'default',
          '&:hover': onRowClick ? { bgcolor: 'action.hover' } : {},
        }}
        onClick={(e) => handleRowClick(row, index, e)}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {primaryColumns.slice(0, isVerySmall ? 2 : 3).map((column, colIndex) => {
                const value = row[column.id as keyof T];
                const displayValue = column.format ? column.format(value, row) : String(value || '');
                const mobileDisplayValue = column.mobileRender ? column.mobileRender(value, row) : displayValue;

                if (colIndex === 0) {
                  // Primary field
                  return (
                    <Typography
                      key={String(column.id)}
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {mobileDisplayValue}
                    </Typography>
                  );
                } else {
                  // Secondary fields
                  return (
                    <Box key={String(column.id)} sx={{ mb: 0.5 }}>
                      {typeof mobileDisplayValue === 'string' ? (
                        <Typography variant="body2" color="text.secondary">
                          <strong>{column.mobileLabel || column.label}:</strong> {mobileDisplayValue}
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {column.mobileLabel || column.label}:
                          </Typography>
                          {mobileDisplayValue}
                        </Box>
                      )}
                    </Box>
                  );
                }
              })}
            </Box>

            {secondaryColumns.length > 0 && (
              <IconButton
                className="expand-button"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpansion(rowKey);
                }}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                {isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
              </IconButton>
            )}
          </Box>

          {secondaryColumns.length > 0 && (
            <Collapse in={isExpanded}>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {secondaryColumns.map((column) => {
                  const value = row[column.id as keyof T];
                  const displayValue = column.format ? column.format(value, row) : String(value || '');
                  const mobileDisplayValue = column.mobileRender ? column.mobileRender(value, row) : displayValue;

                  return (
                    <Box key={String(column.id)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, minWidth: '40%' }}>
                        {column.mobileLabel || column.label}:
                      </Typography>
                      <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>
                        {typeof mobileDisplayValue === 'string' ? (
                          <Typography variant="body2" sx={{ wordWrap: 'break-word' }}>
                            {mobileDisplayValue}
                          </Typography>
                        ) : (
                          mobileDisplayValue
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Collapse>
          )}
        </CardContent>
      </Card>
    );
  };

  const DesktopTable = () => (
    <TableContainer 
      component={Paper} 
      sx={{ 
        maxHeight: maxHeight || 'none',
        '& .MuiTableCell-root': {
          padding: dense ? '8px 16px' : '16px',
        }
      }}
    >
      <Table stickyHeader={!!maxHeight} size={dense ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={String(column.id)}
                align={column.align || 'left'}
                style={{ minWidth: column.minWidth }}
                sx={{
                  fontWeight: 600,
                  bgcolor: 'background.paper',
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">Загрузка...</Typography>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                hover
                key={getRowKey(row, index)}
                sx={{ 
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:last-child td, &:last-child th': { border: 0 }
                }}
                onClick={(e) => handleRowClick(row, index, e)}
              >
                {columns.map((column) => {
                  const value = row[column.id as keyof T];
                  const displayValue = column.format ? column.format(value, row) : String(value || '');
                  
                  return (
                    <TableCell key={String(column.id)} align={column.align || 'left'}>
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {title && (
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      
      {isMobile ? (
        <Box>
          {loading ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Загрузка...</Typography>
              </CardContent>
            </Card>
          ) : data.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </CardContent>
            </Card>
          ) : (
            data.map((row, index) => (
              <MobileCard key={getRowKey(row, index)} row={row} index={index} />
            ))
          )}
        </Box>
      ) : (
        <DesktopTable />
      )}

      {pagination && (
        <TablePagination
          rowsPerPageOptions={pagination.rowsPerPageOptions || [10, 25, 50]}
          component="div"
          count={pagination.totalRows}
          rowsPerPage={pagination.rowsPerPage}
          page={pagination.page}
          onPageChange={(event, newPage) => pagination.onPageChange(newPage)}
          onRowsPerPageChange={(event) => pagination.onRowsPerPageChange(parseInt(event.target.value, 10))}
          labelRowsPerPage={isMobile ? "Строк:" : "Строк на странице:"}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} из ${count !== -1 ? count : `более ${to}`}`
          }
          sx={{
            '& .MuiTablePagination-toolbar': {
              minHeight: isMobile ? 44 : 52,
            },
            '& .MuiTablePagination-select': {
              minHeight: isMobile ? 32 : 'auto',
            },
            '& .MuiIconButton-root': {
              minWidth: 44,
              minHeight: 44,
            }
          }}
        />
      )}
    </Box>
  );
};

export default ResponsiveTable;