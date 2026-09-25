function appendEvidence(state, event) {
  return { ...state, timeline: [...state.timeline, { ...event, minute: state.clock.minute }] };
}

export function delegateTask(state, { taskId, staffId, scopePolicy }) {
  const task = state.tasks?.[taskId];
  const staffMember = state.staff?.[staffId];
  if (!task) throw new RangeError(`Unknown task: ${taskId}`);
  if (!staffMember) throw new RangeError(`Unknown staff member: ${staffId}`);
  if (task.status !== 'open') return state;

  if (!scopePolicy?.canDelegate?.(task.actionId, staffMember.role)) {
    return appendEvidence(state, {
      kind: 'DELEGATION_REJECTED_SCOPE',
      taskId,
      staffId,
      actionId: task.actionId
    });
  }

  return {
    ...state,
    tasks: {
      ...state.tasks,
      [taskId]: {
        ...task,
        status: 'delegated',
        delegatedTo: staffId,
        delegatedAt: state.clock.minute,
        progressTicks: 0
      }
    },
    staff: {
      ...state.staff,
      [staffId]: {
        ...staffMember,
        queue: [...(staffMember.queue ?? []), taskId]
      }
    },
    timeline: [
      ...state.timeline,
      { kind: 'TASK_DELEGATED', taskId, staffId, minute: state.clock.minute }
    ]
  };
}

export function advanceDelegatedTasks(state, { maxWorkload = 3 } = {}) {
  let tasks = { ...(state.tasks ?? {}) };
  let staff = { ...(state.staff ?? {}) };
  let timeline = [...state.timeline];

  for (const staffId of Object.keys(staff).sort()) {
    const originalMember = staff[staffId];
    let member = { ...originalMember, queue: [...(originalMember.queue ?? [])] };
    if (member.queue.length === 0) {
      staff[staffId] = member;
      continue;
    }

    const taskId = member.queue[0];
    const task = tasks[taskId];
    if (!task || task.status === 'complete') {
      member.queue = member.queue.filter(id => id !== taskId);
      staff[staffId] = member;
      continue;
    }

    if (!member.available) {
      timeline.push({ kind: 'DELEGATION_DELAYED_UNAVAILABLE', taskId, staffId, minute: state.clock.minute });
      staff[staffId] = member;
      continue;
    }

    if ((member.workload ?? 0) >= maxWorkload && task.status === 'delegated') {
      timeline.push({ kind: 'DELEGATION_DELAYED_OVERLOAD', taskId, staffId, minute: state.clock.minute });
      staff[staffId] = member;
      continue;
    }

    const requiredTicks = Math.max(1, task.requiredTicks ?? 2);
    const nextProgress = (task.progressTicks ?? 0) + 1;

    if (nextProgress >= requiredTicks) {
      tasks[taskId] = {
        ...task,
        status: 'complete',
        progressTicks: nextProgress,
        completedMinute: state.clock.minute
      };
      member.queue = member.queue.filter(id => id !== taskId);
      member.workload = Math.max(0, (member.workload ?? 0) - (task.status === 'in_progress' ? 1 : 0));
      timeline.push({ kind: 'DELEGATED_TASK_COMPLETED', taskId, staffId, minute: state.clock.minute });
    } else {
      tasks[taskId] = {
        ...task,
        status: 'in_progress',
        progressTicks: nextProgress,
        startedMinute: task.startedMinute ?? state.clock.minute
      };
      if (task.status === 'delegated') member.workload = (member.workload ?? 0) + 1;
      timeline.push({ kind: 'DELEGATED_TASK_PROGRESS', taskId, staffId, progressTicks: nextProgress, minute: state.clock.minute });
    }

    staff[staffId] = member;
  }

  return { ...state, tasks, staff, timeline };
}
