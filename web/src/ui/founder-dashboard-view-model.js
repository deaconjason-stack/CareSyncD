export function buildFounderDashboardModel(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') throw new TypeError('Founder snapshot is required');
  const identified = Array.isArray(snapshot.identifiedSubscribers) ? snapshot.identifiedSubscribers : [];
  return {
    asOf:snapshot.asOf,
    metrics:{
      totalSubscribers:snapshot.subscribers?.total ?? 0,
      activeSubscribers:snapshot.subscribers?.status?.active ?? 0,
      paymentIssues:snapshot.subscribers?.status?.paymentIssue ?? 0,
      canceled:snapshot.subscribers?.status?.canceled ?? 0,
      expired:snapshot.subscribers?.status?.expired ?? 0,
      new30d:snapshot.subscribers?.new30d ?? 0,
      shiftsStarted:snapshot.learning?.shiftsStarted ?? 0,
      shiftsCompleted:snapshot.learning?.shiftsCompleted ?? 0
    },
    funnel:{...(snapshot.funnel ?? {})},
    byPlan:{...(snapshot.subscribers?.byPlan ?? {})},
    byCadence:{...(snapshot.subscribers?.byCadence ?? {})},
    acquisition:{...(snapshot.acquisition ?? {})},
    learning:{...(snapshot.learning ?? {}),completedByUnit:{...(snapshot.learning?.completedByUnit ?? {})}},
    subscriberRows:identified
      .filter(item => item?.accountId)
      .map(item => ({
        accountId:item.accountId,
        displayName:item.displayName,
        email:item.email,
        planId:item.planId,
        cadence:item.cadence,
        status:item.billingState
      }))
  };
}
