import test from 'node:test';
import assert from 'node:assert/strict';
import { derivePresence, scheduleMatches, checkPassage, rankMatches, buildVisits, localDateParts } from '../src/domain.js';
const employee = { id: 1, status: 'active', accessLevelId: 1 };
const room = { id: 1, capacity: 3 };
const permission = { accessLevelId: 1, roomId: 1, days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '18:00', active: true };
const monday = '2026-11-02T10:00:00+03:00';
const entry = (employeeId = 1, roomId = 1, timestamp = monday) => ({ employeeId, roomId, direction: 'entry', result: 'allowed', timestamp });
const check = extra => checkPassage({ employee, room, direction: 'entry', permissions: [permission], events: [], timestamp: monday, ...extra });

test('unknown and denied passages do not move a person', () => {
  const events = [entry(), { ...entry(1, 2), result: 'denied', timestamp: '2026-11-02T11:00:00+03:00' }, { ...entry(null, 2) }];
  assert.equal(derivePresence(events).get('1').roomId, 1);
  assert.equal(derivePresence(events).size, 1);
  assert.equal(check({ employee: null }).result, 'denied');
});
test('successful room transition keeps one location and an exit clears it', () => {
  const events = [entry(), entry(1, 2, '2026-11-02T11:00:00+03:00')];
  assert.equal(derivePresence(events).get('1').roomId, 2);
  assert.equal(derivePresence(events).size, 1);
  events.push({ ...entry(1, 2, '2026-11-02T12:00:00+03:00'), direction: 'exit' });
  assert.equal(derivePresence(events).size, 0);
});
test('duplicate entry and exit from a different room are not registered', () => {
  assert.equal(check({ events: [entry()] }).result, 'invalid');
  assert.equal(check({ direction: 'exit', events: [entry(1, 2)] }).result, 'invalid');
});
test('blocking prevents entry but permits a registered occupant to exit', () => {
  const blocked = { ...employee, status: 'blocked' };
  assert.equal(check({ employee: blocked }).result, 'denied');
  assert.equal(check({ employee: blocked, direction: 'exit', permissions: [], events: [entry()] }).result, 'allowed');
});
test('time windows, dates, revoked permissions and weekdays are enforced', () => {
  assert.equal(check().result, 'allowed');
  assert.equal(check({ timestamp: '2026-11-02T19:00:00+03:00' }).result, 'denied');
  assert.equal(check({ timestamp: '2026-11-01T12:00:00+03:00' }).result, 'denied');
  assert.equal(check({ permissions: [{ ...permission, validTo: '2026-11-01' }] }).result, 'denied');
  assert.equal(check({ permissions: [{ ...permission, active: false }] }).result, 'denied');
  assert.equal(check({ permissions: [{ ...permission, employeeId: 1, accessLevelId: null }] }).result, 'allowed');
});
test('night shift early hours belong to the previous scheduled weekday', () => {
  const night = { ...permission, days: [1], startTime: '22:00', endTime: '06:00' };
  assert.equal(scheduleMatches(night, '2026-11-03T02:00:00+03:00'), true);
  assert.equal(scheduleMatches(night, '2026-11-02T02:00:00+03:00'), false);
  assert.equal(scheduleMatches(night, '2026-11-03T10:00:00+03:00'), false);
});
test('capacity limit prevents another occupant from entering', () => {
  assert.equal(check({ room: { ...room, capacity: 1 }, events: [entry(2)] }).result, 'denied');
});
test('similarity has a threshold and rejects a close second employee', () => {
  assert.equal(rankMatches([{ employeeId: 1, similarity: 0.49 }]).employeeId, null);
  assert.equal(rankMatches([{ employeeId: 1, similarity: 0.8 }, { employeeId: 2, similarity: 0.77 }]).ambiguous, true);
  assert.equal(rankMatches([{ employeeId: 1, similarity: 0.8 }, { employeeId: 2, similarity: 0.5 }]).employeeId, 1);
});
test('multiple photos of one employee do not count as different candidates', () => {
  const result = rankMatches([{ employeeId: 1, similarity: 0.8 }, { employeeId: 1, similarity: 0.79 }, { employeeId: 2, similarity: 0.5 }]);
  assert.equal(result.employeeId, 1);
  assert.equal(result.ambiguous, false);
});
test('visit duration closes on transition and includes an open visit', () => {
  const visits = buildVisits([entry(), entry(1, 2, '2026-11-02T11:00:00+03:00')], '2026-11-02T12:00:00+03:00');
  assert.equal(visits.length, 2);
  assert.equal(visits[0].end, '2026-11-02T11:00:00+03:00');
  assert.equal(visits[1].ongoing, true);
});
test('Moscow date is used near the UTC midnight boundary', () => {
  assert.deepEqual(localDateParts('2026-11-01T22:30:00Z'), { date: '2026-11-02', time: '01:30', day: 1 });
});
