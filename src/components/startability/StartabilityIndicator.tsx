/**
 * StartabilityIndicator - компонент для отображения статуса стартуемости проекта
 * 
 * Показывает можно ли начать работу над проектом и детальные причины блокировки
 */

import React from 'react';
import {
  Chip,
  Tooltip,
  Stack,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box
} from '@mui/material';
import {
  CheckCircle as StartableIcon,
  Block as BlockedIcon,
  ExpandMore as ExpandIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  ProjectStartability,
  StartabilityReasonCode,
  getReasonText,
  getReasonIcon,
  groupReasonsByCategory
} from '../../utils/startability';

interface StartabilityIndicatorProps {
  /** Данные о стартуемости проекта */
  startability: ProjectStartability;
  /** Компактный режим отображения (только основной индикатор) */
  compact?: boolean;
  /** Показывать детали в развернутом виде */
  showDetails?: boolean;
}

/**
 * Основной индикатор стартуемости (чип с иконкой)
 */
export const StartabilityChip: React.FC<{
  startable: boolean;
  reasonsCount: number;
  size?: 'small' | 'medium';
}> = ({ startable, reasonsCount, size = 'small' }) => {
  if (startable) {
    return (
      <Chip
        icon={<StartableIcon />}
        label="Можно начать"
        color="success"
        size={size}
        variant="filled"
      />
    );
  }

  return (
    <Tooltip title={`${reasonsCount} ${reasonsCount === 1 ? 'причина' : 'причин'} блокировки`}>
      <Chip
        icon={<BlockedIcon />}
        label="Нельзя начать"
        color="error"
        size={size}
        variant="filled"
      />
    </Tooltip>
  );
};

/**
 * Чипы с причинами блокировки
 */
export const ReasonChips: React.FC<{
  reasons: StartabilityReasonCode[];
  maxVisible?: number;
}> = ({ reasons, maxVisible = 3 }) => {
  const visibleReasons = reasons.slice(0, maxVisible);
  const hiddenCount = Math.max(0, reasons.length - maxVisible);

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap">
      {visibleReasons.map((reason) => (
        <Tooltip key={reason} title={getReasonText(reason)}>
          <Chip
            label={`${getReasonIcon(reason)} ${getReasonText(reason)}`}
            size="small"
            color="warning"
            variant="outlined"
          />
        </Tooltip>
      ))}
      {hiddenCount > 0 && (
        <Chip
          label={`+${hiddenCount} еще`}
          size="small"
          color="default"
          variant="outlined"
        />
      )}
    </Stack>
  );
};

/**
 * Детальная панель с группировкой причин по категориям
 */
export const StartabilityDetails: React.FC<{
  startability: ProjectStartability;
}> = ({ startability }) => {
  const { reasons, blockedTasksSample } = startability;
  
  if (startability.startable) {
    return (
      <Alert severity="success" icon={<StartableIcon />}>
        <Typography variant="body2">
          Проект готов к запуску. Доступно задач: {startability.startableTaskCount}
          {startability.estimateCount > 0 && `, смет: ${startability.estimateCount}`}
        </Typography>
      </Alert>
    );
  }

  const groupedReasons = groupReasonsByCategory(reasons);

  return (
    <Stack spacing={2}>
      <Alert severity="error" icon={<BlockedIcon />}>
        <Typography variant="body2" gutterBottom>
          Проект заблокирован для старта. Причины:
        </Typography>
      </Alert>

      {/* Причины по категориям */}
      {Object.entries(groupedReasons).map(([category, categoryReasons]) => {
        if (categoryReasons.length === 0) return null;

        const categoryNames = {
          project: 'Проект',
          tasks: 'Задачи',
          permissions: 'Права доступа',
          business: 'Бизнес-процессы'
        };

        return (
          <Accordion key={category} defaultExpanded={categoryReasons.length <= 3}>
            <AccordionSummary expandIcon={<ExpandIcon />}>
              <Typography variant="subtitle2">
                {categoryNames[category as keyof typeof categoryNames]} 
                ({categoryReasons.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {categoryReasons.map((reason) => (
                  <ListItem key={reason}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Typography variant="h6">{getReasonIcon(reason)}</Typography>
                    </ListItemIcon>
                    <ListItemText 
                      primary={getReasonText(reason)}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Примеры заблокированных задач */}
      {blockedTasksSample && blockedTasksSample.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandIcon />}>
            <Typography variant="subtitle2">
              Заблокированные задачи (примеры)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {blockedTasksSample.map((task) => (
                <ListItem key={task.id}>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={task.title}
                    secondary={
                      <Stack direction="row" spacing={0.5} mt={0.5}>
                        {task.reasons.slice(0, 2).map((reason) => (
                          <Chip
                            key={reason}
                            label={getReasonIcon(reason)}
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        ))}
                        {task.reasons.length > 2 && (
                          <Chip
                            label={`+${task.reasons.length - 2}`}
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Статистика */}
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Задачи: {startability.startableTaskCount} из {startability.totalTaskCount} доступны
          {startability.estimateCount > 0 && ` • Смет: ${startability.estimateCount}`}
        </Typography>
      </Box>
    </Stack>
  );
};

/**
 * Основной компонент индикатора стартуемости
 */
export const StartabilityIndicator: React.FC<StartabilityIndicatorProps> = ({
  startability,
  compact = false,
  showDetails = false
}) => {
  if (compact) {
    return (
      <StartabilityChip
        startable={startability.startable}
        reasonsCount={startability.reasons.length}
      />
    );
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <StartabilityChip
          startable={startability.startable}
          reasonsCount={startability.reasons.length}
          size="medium"
        />
        {!startability.startable && startability.reasons.length > 0 && (
          <ReasonChips reasons={startability.reasons} maxVisible={2} />
        )}
      </Stack>
      
      {showDetails && (
        <StartabilityDetails startability={startability} />
      )}
    </Stack>
  );
};

export default StartabilityIndicator;