import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { LoadingType } from '@constants';
import { ArtistModel } from '@models';
import { Store } from '@ngrx/store';
import { LoadingSelectors, LoadingState } from '@store';
import { debounceTime } from 'rxjs';
import { MATRIX_BREAKPOINTS } from '../../constants/virtuall-scroll-matrix-breakpoints.const';
import { ArtistsActions } from '../../store/artists.actions';
import { ArtistsState } from '../../store/artists.reducers';
import { ArtistsSelectors } from '../../store/artists.selectors';
import { ArtistCardComponent } from '../../ui/artist-card/artist-card.component';

@Component({
  selector: 'app-artist-list',
  imports: [
    ScrollingModule,
    ReactiveFormsModule,
    ArtistCardComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './artist-list.component.html',
  styleUrl: './artist-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ArtistListComponent implements OnInit {
  private virtualScrollViewport = viewChild(CdkVirtualScrollViewport);

  private artistsStore = inject(Store<ArtistsState>);
  private loadingStore = inject(Store<LoadingState>);

  protected readonly artists = toSignal(
    this.artistsStore.select(ArtistsSelectors.selectAllArtists),
  );

  protected readonly loading = toSignal(
    this.loadingStore.select(LoadingSelectors.selectLoading, {
      type: LoadingType.ARTISTS_LIST,
    }),
  );

  protected searchControl = new FormControl<string>('');
  protected artistsMatrix = signal<ArtistModel[][]>([]);

  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const artists = this.artists();
      if (artists) {
        untracked(() => {
          this.artistsMatrix.set(this.changeMatrixSizes(artists, 5));
        });
      }
    });

    effect(() => {
      const viewport = this.virtualScrollViewport();
      if (viewport) {
        this.initializeObserver(viewport);
      }
    });
  }

  ngOnInit() {
    this.artistsStore.dispatch(ArtistsActions.getArtists());

    this.searchControl.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.artistsStore.dispatch(
          ArtistsActions.setFilterOptions({ search: value }),
        );
      });
  }

  protected trackByIndex(index: number): number {
    return index;
  }

  protected nextBatch(index: number): void {
    const total = this.virtualScrollViewport()?.getDataLength() ?? 0;
    if (index > total / 1.9) {
      console.log('true');
    }
  }

  private initializeObserver(viewport: CdkVirtualScrollViewport): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;

        const breakpoint = MATRIX_BREAKPOINTS.find(
          (breakpoint) =>
            width >= (breakpoint.minWidth || 0) &&
            width <= (breakpoint.maxWidth || Infinity),
        );

        if (breakpoint) {
          this.artistsMatrix.set(
            this.changeMatrixSizes(this.artists() ?? [], breakpoint.columns),
          );
        }
      }
    });

    resizeObserver.observe(viewport.elementRef.nativeElement);
  }

  private changeMatrixSizes(
    movies: ArtistModel[],
    size: number,
  ): ArtistModel[][] {
    return Array.from({ length: Math.ceil(movies.length / size) }, (_, i) =>
      movies.slice(i * size, (i + 1) * size),
    );
  }

  protected readonly Array = Array;
}
