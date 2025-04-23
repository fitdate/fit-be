import { Introduction as IntroEntity } from '../../profile/introduction/entities/introduction.entity';
import { Feedback as FeedbackEntity } from '../../profile/feedback/entities/feedback.entity';
import { InterestCategory as CategoryEntity } from '../../profile/interest-category/entities/interest-category.entity';

export interface IntroductionWithContent extends IntroEntity {
  content: string;
}

export interface FeedbackWithContent extends FeedbackEntity {
  content: string;
}

export interface InterestCategoryWithName extends CategoryEntity {
  name: string;
}
