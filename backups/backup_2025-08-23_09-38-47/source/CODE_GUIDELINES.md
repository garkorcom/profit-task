## Инструкция: обертки над компонентами MUI (Button, IconButton и др.)

Чтобы избежать типовых ошибок при использовании собственных оберток над компонентами MUI (например, ошибок вроде TS2322 при `color="inherit"` или отсутствия `sx`), придерживайтесь следующих правил.

### Правило
- Типизируйте пропсы обертки через пропсы соответствующего MUI-компонента и пробрасывайте их внутрь, НЕ сужая API.

Пример для кнопки:

```tsx
import React from 'react';
import { Button } from '@mui/material';
import type { ButtonProps as MUIButtonProps } from '@mui/material/Button';

interface MyButtonProps extends Omit<MUIButtonProps, 'children'> {
  buttonText?: string;
}

const MyButton: React.FC<MyButtonProps> = ({
  variant = 'contained',
  color = 'primary',
  size = 'medium',
  startIcon,
  buttonText = 'Нажать',
  onClick,
  disabled,
  ...other
}) => (
  <Button
    variant={variant}
    color={color}
    size={size}
    startIcon={startIcon}
    onClick={(e) => {
      onClick?.(e);
      // Доп. внутренняя логика при клике (если нужна)
    }}
    disabled={Boolean(disabled)}
    {...other} // ВАЖНО: пробрасывайте остальные пропсы (в т.ч. sx)
  >
    {buttonText}
  </Button>
);

export default MyButton;
```

### Почему так
- `color` в MUI поддерживает значения из темы, включая `inherit`. Если вы вручную сужаете тип до `'primary' | 'secondary' | ...'`, то `inherit` перестает быть валидным и возникает ошибка типа (пример: TS2322: Type '"inherit"' is not assignable...).
- `sx` — стандартный проп MUI. Если не пробрасывать остальные пропсы, `sx` становится недоступным.
- Исключение `onClick` из интерфейса и последующая деструктуризация приведут к ошибке вида TS2339 (свойство `onClick` не существует).

### Чеклист для оберток
- color: используйте `ButtonProps['color']` (через расширение `ButtonProps`), не задавайте собственный узкий union.
- sx: обязательно пробрасывайте (через `...other`).
- onClick/disabled: не вырезайте; объединяйте поведение (сначала вызовите внешний `onClick`, затем свою логику; `disabled` комбинируйте через `Boolean(disabled) || ваши_условия`).
- Spread пропсов: передавайте остальные пропсы внутрь базового MUI-компонента, лучше в конце, чтобы позволить переопределение по месту вызова.
- Свои пропсы: добавляйте отдельные поля (например, `buttonText`), но не блокируйте стандартные MUI-пропсы.

### Антипаттерны (что не делать)
- Жестко перечислять тип `color` вручную (ломает `inherit`).
- Запрещать `sx` или не пробрасывать остальные пропсы.
- Удалять `onClick` из пропсов обертки, а затем деструктурировать его.

Примечание: пример корректной реализации см. в `src/components/TimeTrackingButton.tsx`.


