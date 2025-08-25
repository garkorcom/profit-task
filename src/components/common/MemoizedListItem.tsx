import React from 'react';
import { ListItem, ListItemButton, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

interface MemoizedListItemProps {
  id: string;
  primary: string;
  secondary?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

// Мемоизированный компонент для элементов списка
// Перерисовывается только при изменении props
export const MemoizedListItem = React.memo<MemoizedListItemProps>(
  ({ id, primary, secondary, onEdit, onDelete, onClick }) => {
    const content = (
      <>
        <ListItemText primary={primary} secondary={secondary} />
        {(onEdit || onDelete) && (
          <ListItemSecondaryAction>
            {onEdit && (
              <IconButton edge="end" aria-label="edit" onClick={onEdit}>
                <EditIcon />
              </IconButton>
            )}
            {onDelete && (
              <IconButton edge="end" aria-label="delete" onClick={onDelete}>
                <DeleteIcon />
              </IconButton>
            )}
          </ListItemSecondaryAction>
        )}
      </>
    );

    if (onClick) {
      return (
        <ListItem disablePadding>
          <ListItemButton onClick={onClick}>
            {content}
          </ListItemButton>
        </ListItem>
      );
    }

    return <ListItem>{content}</ListItem>;
  },
  // Функция сравнения props для оптимизации
  (prevProps, nextProps) => {
    return (
      prevProps.id === nextProps.id &&
      prevProps.primary === nextProps.primary &&
      prevProps.secondary === nextProps.secondary
    );
  }
);

MemoizedListItem.displayName = 'MemoizedListItem';

export default MemoizedListItem;
