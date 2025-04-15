export const SEED_PATH = {
  feedback: {
    path: 'src/modules/seed/feedback.seed.json',
    configKey: 'feedback',
    fieldName: 'name',
    method: 'findAllFeedback',
    servicePath: 'src/modules/profile/feedback/common/feedback.service',
  },
  interestCategory: {
    path: 'src/modules/seed/interest-category.seed.json',
    configKey: 'interestCategory',
    fieldName: 'name',
    method: 'findAllInterestCategory',
    servicePath:
      'src/modules/profile/interest-category/common/interest-category.service',
  },
  introduction: {
    path: 'src/modules/seed/introduction.seed.json',
    configKey: 'introduction',
    fieldName: 'name',
    method: 'findAllIntroduction',
    servicePath: 'src/modules/profile/introduction/common/introduction.service',
  },
} as const;
