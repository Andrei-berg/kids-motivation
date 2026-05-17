# API Specification

> All functions are in `lib/` — import from the legacy path (backward compat) or new path.

## lib/api.ts (children, days, grades, goals, weeks)

### Children
```ts
getChildren(): Promise<Child[]>
getChild(childId: string): Promise<Child>
getSettings(): Promise<Record<string, any>>
```

### Daily Entry
```ts
saveDay(params: {
  childId, date, roomBed?, roomFloor?, roomDesk?, roomCloset?, roomTrash?,
  roomData?, goodBehavior?, diaryNotDone?, noteParent?, noteChild?
}): Promise<DayData>

getDay(childId: string, date: string): Promise<DayData | null>
```

### Grades
```ts
saveSubjectGrade(params: {
  childId, date, subject, subjectId?, grade, note?
}): Promise<SubjectGrade>

addSubjectGrade  // alias for saveSubjectGrade
getSubjectGradesForDate(childId: string, date: string): Promise<SubjectGrade[]>
deleteSubjectGrade(gradeId: string): Promise<void>
getSubjectSuggestions(childId: string, query?: string): Promise<string[]>
```

### Home Sport
```ts
saveHomeSport(params: {
  childId, date, running, exercises, outdoorGames, stretching, totalMinutes, note?
}): Promise<HomeSport>

getHomeSportForDate(childId: string, date: string): Promise<HomeSport | null>
```

### Sections (Sports)
```ts
getSections(childId: string): Promise<SportsSection[]>
saveSectionAttendance(params: {
  sectionId, childId, date, attended, coachRating?, coachComment?
}): Promise<SectionAttendance>
```

### Goals
```ts
getGoals(childId: string): Promise<{ active: Goal | null, archived: Goal[], all: Goal[] }>
createGoal(params: { childId, title, target }): Promise<Goal>
setActiveGoal(childId: string, goalId: string): Promise<Goal>
archiveGoal(goalId: string, childId: string): Promise<Goal>
getGoalProgress(childId: string, goalId: string): Promise<number>
```

### Weekly Data
```ts
getWeekData(childId: string, weekStart: string): Promise<{
  week, days, grades, sports, weekRecord
}>
finalizeWeek(params: { childId, weekStart, all5Mode, extraBonus, penaltiesManual, noteParent, breakdown }): Promise<Week>
getWeekScore(childId: string, weekStart: string): Promise<{
  coinsFromGrades, coinsFromRoom, coinsFromBehavior, total, gradedDays, roomOkDays, filledDays
}>
```

### Streaks
```ts
getStreaks(childId: string): Promise<any[]>
```

---

## lib/wallet-api.ts

### Wallet
```ts
getWallet(childId: string): Promise<Wallet | null>
updateWalletCoins(childId, coinsChange, description, icon?): Promise<Wallet | null>
updateWalletMoney(childId, moneyChange, description, icon?): Promise<Wallet | null>
getWalletSettings(): Promise<WalletSettings>
calculateExchangeRate(coins: number): Promise<{ rate: number, bonus: number }>
```

### Rewards / Shop
```ts
getRewards(filters?: { childId?, rewardType?, category?, activeOnly? }): Promise<Reward[]>
addReward(reward: Partial<Reward>): Promise<Reward>
updateReward(rewardId, updates): Promise<Reward>
deleteReward(rewardId: string): Promise<void>
purchaseReward(childId, rewardId): Promise<RewardPurchase>
getPurchases(childId?): Promise<RewardPurchase[]>
fulfillPurchase(purchaseId, note?): Promise<RewardPurchase>
```

### Exchange & Withdrawals
```ts
exchangeCoins(childId, coinsAmount): Promise<CoinExchange>
getExchanges(childId?): Promise<CoinExchange[]>
requestWithdrawal(childId, amount): Promise<CashWithdrawal>
approveWithdrawal(withdrawalId, note?): Promise<CashWithdrawal>
rejectWithdrawal(withdrawalId, note?): Promise<CashWithdrawal>
getWithdrawals(childId?, status?): Promise<CashWithdrawal[]>
getTransactions(childId?, limit?): Promise<WalletTransaction[]>
```

### Coin Awards
```ts
awardCoinsForGrade(childId, grade, subject?): Promise<void>
awardCoinsForRoom(childId): Promise<void>
awardCoinsForBehavior(childId): Promise<void>
awardCoinsForExercise(childId): Promise<void>
awardCoinsForSport(childId, coachRating, sportName?, coachComment?): Promise<void>
```

### Analytics
```ts
getMonthlyPotential(childId): Promise<MonthlyPotential>
getAuditLog(childId, limit?): Promise<AuditLog[]>
createP2PTransfer(params: { from_child_id, to_child_id, amount, transfer_type, note? }): Promise<any>
```

---

## lib/categories-api.ts (multi-tenant)

```ts
// All accept familyId as explicit parameter
getCategories(familyId: string): Promise<Category[]>
createCategory(familyId, fields): Promise<Category>
updateCategory(categoryId, fields): Promise<void>
toggleCategory(categoryId, isActive): Promise<void>
deleteCategory(categoryId): Promise<void>
getTasks(familyId, categoryId): Promise<Task[]>
createTask(familyId, fields): Promise<Task>
updateTask(taskId, fields): Promise<void>
deleteTask(taskId): Promise<void>
seedDefaultCategories(familyId): Promise<void>
```

## lib/schedule-api.ts (multi-tenant)

```ts
getScheduleItems(familyId, childMemberId): Promise<ScheduleItem[]>
createScheduleItem(familyId, childMemberId, fields): Promise<ScheduleItem>
updateScheduleItem(itemId, fields): Promise<void>
deleteScheduleItem(itemId): Promise<void>
```

## lib/flexible-api.ts (legacy)

```ts
// Subjects
getSubjects(childId, includeArchived?): Promise<Subject[]>
getActiveSubjects(childId): Promise<Subject[]>
createSubject(childId, name): Promise<Subject>
updateSubject(id, updates): Promise<Subject>
archiveSubject(id): Promise<Subject>
deleteSubject(id): Promise<void>
// Schedule (legacy table)
getSchedule(childId): Promise<ScheduleLesson[]>
getScheduleForDay(childId, dayOfWeek): Promise<ScheduleLesson[]>
addScheduleLesson(childId, dayOfWeek, lessonNumber, subjectId): Promise<ScheduleLesson>
// Exercises
getExerciseTypes(activeOnly?): Promise<ExerciseType[]>
getHomeExercises(childId, date): Promise<HomeExercise[]>
saveHomeExercise(childId, date, exerciseTypeId, quantity, note?): Promise<HomeExercise>
```

## lib/expenses-api.ts

```ts
getExpenseCategories(): Promise<ExpenseCategory[]>
addExpense(expense): Promise<Expense>
getExpenses(filters?): Promise<Expense[]>
getExpenseStats(filters?): Promise<ExpenseStats>
getSections(childId?): Promise<Section[]>
addSection(section): Promise<Section>
getSectionVisits(sectionId, startDate?, endDate?): Promise<SectionVisit[]>
markSectionVisit(sectionId, date, attended, progressNote?, trainerFeedback?): Promise<SectionVisit>
```

## lib/badges.ts

```ts
checkAndAwardBadges(childId, date): Promise<string[]>
checkGoalBadge(childId, goalId): Promise<boolean>
checkPerfectWeek(childId, weekStart, penalties): Promise<boolean>
getChildBadges(childId): Promise<any[]>
getAvailableBadges(): Badge[]
```

## lib/streaks.ts

```ts
updateStreaks(childId, date): Promise<void>
getStreakBonuses(childId): Promise<number>
```

## lib/onboarding-api.ts (multi-tenant)

```ts
getOnboardingStep(userId): Promise<number>
updateOnboardingStep(userId, step): Promise<void>
saveParentProfile(userId, profile): Promise<void>
createFamily(userId, family): Promise<FamilyCreateResult>
addChildToFamily(familyId, parentUserId, child): Promise<ChildMember>
lookupFamilyByCode(code): Promise<FamilyLookup | null>
getFamilyChildren(familyId): Promise<ChildProfile[]>
joinFamilyAsChild(familyId, userId, child): Promise<void>
joinFamilyAsAdult(familyId, userId, role, displayName): Promise<void>
getUserDisplayName(userId): Promise<string | null>
```

## lib/push-api.ts (multi-tenant)

```ts
savePushSubscription(familyId, memberId, subscription): Promise<void>
deletePushSubscription(memberId, endpoint): Promise<void>
getPushSubscriptions(memberId): Promise<PushSubscriptionRecord[]>
```
