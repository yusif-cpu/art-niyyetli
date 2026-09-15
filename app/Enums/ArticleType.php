<?php

namespace App\Enums;

enum ArticleType: string
{
    case Interview = 'interview';
    case VideoProject = 'video_project';
    case ArtArticle = 'art_article';
    case ExhibitionReview = 'exhibition_review';
    case News = 'news';
    case Announcement = 'announcement';
}
