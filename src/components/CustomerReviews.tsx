import { useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';

export interface CustomerReview {
  id: string;
  author: string;
  hospital?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export function CustomerReviews() {
  const [reviews] = useState<CustomerReview[]>([]);

  return (
    <section
      aria-label="Customer Reviews"
      className="border-t border-slate-200 bg-white py-16 md:py-20"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-emerald-700">
            Family Feedback
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            Customer Reviews
          </h2>
        </div>

        {reviews.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-emerald-700">
              <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
              Verified Reviews Coming Soon
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
              We are launching soon! Genuine feedback from our first Klang Valley families will be displayed here.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <div
                    className="flex items-center gap-1 text-amber-500"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`h-4 w-4 ${
                          idx < review.rating
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-200'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-slate-700">
                    “{review.comment}”
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">
                    {review.author}
                  </span>
                  {review.hospital && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{review.hospital}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{review.createdAt}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
