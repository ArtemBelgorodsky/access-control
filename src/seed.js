export const RESOURCE_NAMES = ['employees', 'departments', 'positions', 'rooms', 'access_levels', 'permissions', 'face_templates', 'access_events'];
export const DEMO_USERS = [
  { id: 'demo-admin', fullName: 'Александр Волков', role: 'admin', departmentId: 1 },
  { id: 'demo-security', fullName: 'Михаил Соколов', role: 'security', departmentId: 3 },
  { id: 'demo-manager', fullName: 'Анна Морозова', role: 'manager', departmentId: 1 },
];
export function makeSeed() {
  const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
  const rows = [
    [1, 1, 'entry', 'allowed', 205], [2, 2, 'entry', 'allowed', 194],
    [3, 3, 'entry', 'allowed', 181], [4, 1, 'entry', 'allowed', 169],
    [5, 4, 'entry', 'allowed', 158], [6, 5, 'entry', 'allowed', 143],
    [2, 2, 'exit', 'allowed', 100], [2, 4, 'entry', 'allowed', 95],
    [7, 3, 'entry', 'denied', 76], [8, 6, 'entry', 'denied', 61],
    [3, 3, 'exit', 'allowed', 43], [3, 2, 'entry', 'allowed', 40],
    [null, 3, 'entry', 'denied', 22], [6, 5, 'exit', 'allowed', 15],
    [6, 1, 'entry', 'allowed', 8],
  ];
  return {
    departments: [{ id: 1, name: 'IT-отдел' }, { id: 2, name: 'Финансовый отдел' }, { id: 3, name: 'Служба безопасности' }, { id: 4, name: 'Администрация' }],
    positions: [{ id: 1, name: 'Разработчик' }, { id: 2, name: 'Бухгалтер' }, { id: 3, name: 'Системный администратор' }, { id: 4, name: 'Руководитель' }, { id: 5, name: 'Специалист' }],
    employees: [
      { id: 1, fullName: 'Алексей Иванов', personnelNumber: 'EMP-001', departmentId: 1, positionId: 1, accessLevelId: 1, status: 'active' },
      { id: 2, fullName: 'Анна Морозова', personnelNumber: 'EMP-002', departmentId: 1, positionId: 4, accessLevelId: 1, status: 'active' },
      { id: 3, fullName: 'Дмитрий Козлов', personnelNumber: 'EMP-003', departmentId: 1, positionId: 3, accessLevelId: 2, status: 'active' },
      { id: 4, fullName: 'Елена Петрова', personnelNumber: 'EMP-004', departmentId: 2, positionId: 2, accessLevelId: 3, status: 'active' },
      { id: 5, fullName: 'Ольга Смирнова', personnelNumber: 'EMP-005', departmentId: 4, positionId: 5, accessLevelId: 1, status: 'active' },
      { id: 6, fullName: 'Михаил Соколов', personnelNumber: 'EMP-006', departmentId: 3, positionId: 5, accessLevelId: 2, status: 'active' },
      { id: 7, fullName: 'Артём Васильев', personnelNumber: 'EMP-007', departmentId: 1, positionId: 1, accessLevelId: 1, status: 'active' },
      { id: 8, fullName: 'Павел Новиков', personnelNumber: 'EMP-008', departmentId: 4, positionId: 5, accessLevelId: 1, status: 'blocked' },
    ],
    rooms: [
      { id: 1, name: 'Открытый офис', number: '201', floor: 2, purpose: 'Рабочее пространство', equipment: 'Считыватель СКУД · турникет', capacity: 20, zone: 'Общая зона' },
      { id: 2, name: 'IT-отдел', number: '204', floor: 2, purpose: 'Работа отдела разработки', equipment: 'Считыватель СКУД · электронный замок', capacity: 12, zone: 'Служебная зона' },
      { id: 3, name: 'Серверная', number: '105', floor: 1, purpose: 'Серверное оборудование', equipment: 'Биометрический терминал · электронный замок', capacity: 3, zone: 'Ограниченный доступ' },
      { id: 4, name: 'Переговорная', number: '202', floor: 2, purpose: 'Совещания и встречи', equipment: 'Считыватель СКУД', capacity: 8, zone: 'Общая зона' },
      { id: 5, name: 'Бухгалтерия', number: '203', floor: 2, purpose: 'Финансовый учёт', equipment: 'Считыватель СКУД · электронный замок', capacity: 6, zone: 'Служебная зона' },
      { id: 6, name: 'Архив', number: '106', floor: 1, purpose: 'Хранение документов', equipment: 'Считыватель СКУД', capacity: 4, zone: 'Ограниченный доступ' },
    ],
    access_levels: [{ id: 1, name: 'Базовый', description: 'Офис и переговорная' }, { id: 2, name: 'Технический', description: 'Все помещения, круглосуточно' }, { id: 3, name: 'Финансовый', description: 'Офис, переговорная и бухгалтерия' }],
    permissions: [
      ...[1, 2, 3, 4, 5, 6].map((roomId, index) => ({ id: index + 1, accessLevelId: 2, roomId, days: [0, 1, 2, 3, 4, 5, 6], startTime: '00:00', endTime: '23:59', active: true })),
      ...[1, 4].map((roomId, index) => ({ id: index + 7, accessLevelId: 1, roomId, days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '20:00', active: true })),
      ...[1, 4, 5].map((roomId, index) => ({ id: index + 9, accessLevelId: 3, roomId, days: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '20:00', active: true })),
    ],
    face_templates: [],
    access_events: rows.map(([employeeId, roomId, direction, result, minutes], index) => ({ id: index + 1, operationId: `seed-${index}`, employeeId, roomId, direction, result, timestamp: ago(minutes), reason: result === 'allowed' ? (direction === 'entry' ? 'Вход зарегистрирован' : 'Выход зарегистрирован') : employeeId === null ? 'Лицо не распознано' : employeeId === 8 ? 'Сотрудник заблокирован' : 'Нет разрешения на вход в помещение', source: 'demo', reviewed: index === 8 })),
  };
}
