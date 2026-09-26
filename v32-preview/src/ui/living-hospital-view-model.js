const clone = value => value == null ? value : (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function buildHospitalCockpitModel(world = {}) {
  const patients = Object.values(world.patients ?? {}).map(clone);
  const staff = Object.values(world.staff ?? {});
  const tasks = Object.values(world.tasks ?? {});
  const units = Object.values(world.units ?? {});
  const events = Array.isArray(world.events) ? world.events : [];

  const taskSummary = {
    open:tasks.filter(task => task.status !== 'complete').length,
    complete:tasks.filter(task => task.status === 'complete').length,
    urgentOpen:tasks.filter(task => task.status !== 'complete' && task.priority === 'urgent').length
  };

  const staffing = {
    total:staff.length,
    available:staff.filter(member => member.available === true).length,
    unavailable:staff.filter(member => member.available !== true).length,
    totalLoad:staff.reduce((sum, member) => sum + Number(member.load ?? 0), 0)
  };

  const totalBeds = units.reduce((sum, unit) => sum + Number(unit.beds ?? 0), 0);
  const occupied = units.reduce((sum, unit) => sum + Number(unit.occupied ?? 0), 0);

  return {
    minute:Number(world.clock?.minute ?? 0),
    patientStrip:patients,
    activeAlerts:events.filter(event => event.severity === 'critical' || event.severity === 'high').map(clone),
    tasks:taskSummary,
    staffing,
    census:{totalBeds,occupied,openBeds:Math.max(0,totalBeds-occupied)},
    pressure:Number(world.pressure?.used ?? 0)
  };
}
