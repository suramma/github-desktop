import * as React from 'react'

import { ImageDiffType } from '../../../lib/app-state'
import { Image } from '../../../models/diff'
import { renderImage } from './render-image'
import { TabBar, TabBarType } from '../../tab-bar'

interface IModifiedImageDiffProps {
  readonly previous: Image
  readonly current: Image
  readonly diffType: ImageDiffType
  readonly onChangeDiffType: (type: ImageDiffType) => void
}

interface IImageSize {
  readonly width: number
  readonly height: number
}

interface IModifiedImageDiffState {
  /**
   * The current value used as a parameter for whatever image diff mode is
   * active. For example, for onion skin diffs, this is the alpha value.
   */
  readonly value: number

  /** The size of the previous image. */
  readonly previousImageSize: IImageSize | null

  /** The size of the current image. */
  readonly currentImageSize: IImageSize | null
}

const SIZE_CONTROLS = 60
const PADDING = 20

function getFittingSize(
  imageSize: IImageSize,
  containerSize: IImageSize
): IImageSize {
  // keep some padding
  const containerWidth = containerSize.width - PADDING
  const containerHeight = containerSize.height - PADDING - SIZE_CONTROLS

  // check wether we will need to scale the images or not
  const heightRatio =
    containerHeight < imageSize.height ? imageSize.height / containerHeight : 1
  const widthRatio =
    containerWidth < imageSize.width ? imageSize.width / containerWidth : 1

  // Use max to prevent scaling up the image
  let ratio = Math.max(1, widthRatio)
  if (widthRatio < heightRatio) {
    // fit to height
    ratio = Math.max(1, heightRatio)
  }

  return {
    width: imageSize.width / ratio,
    height: imageSize.height / ratio,
  }
}

/** A component which renders the changes to an image in the repository */
export class ModifiedImageDiff extends React.Component<
  IModifiedImageDiffProps,
  IModifiedImageDiffState
> {
  private container: HTMLDivElement | null

  public constructor(props: IModifiedImageDiffProps) {
    super(props)
    this.state = {
      value: 1,
      previousImageSize: null,
      currentImageSize: null,
    }
  }

  private onValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value)
    this.setState({ value })
  }

  private onPreviousImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const size = {
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    }
    this.setState({ previousImageSize: size })
  }

  private onCurrentImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const size = {
      width: e.currentTarget.naturalWidth,
      height: e.currentTarget.naturalHeight,
    }
    this.setState({ currentImageSize: size })
  }

  private getScaledDimensions() {
    const { previousImageSize, currentImageSize } = this.state

    const containerWidth =
      (this.container && this.container.getBoundingClientRect().width) || 0
    const containerHeight =
      (this.container && this.container.getBoundingClientRect().height) || 0
    const containerSize = { width: containerWidth, height: containerHeight }

    let height = 0
    let width = 0

    if (previousImageSize && currentImageSize) {
      const previousSize = getFittingSize(previousImageSize, containerSize)
      const currentSize = getFittingSize(currentImageSize, containerSize)

      height = Math.max(previousSize.height, currentSize.height)
      width = Math.max(previousSize.width, currentSize.height)
    }

    return {
      height,
      width,
      containerHeight,
      containerWidth,
    }
  }

  private onContainerRef = (c: HTMLDivElement | null) => {
    this.container = c
  }

  public render() {
    const { height, width, containerWidth } = this.getScaledDimensions()
    return (
      <div className="panel image" id="diff" ref={this.onContainerRef}>
        {this.props.diffType === ImageDiffType.TwoUp &&
          this.render2Up(height, width, containerWidth)}
        {this.props.diffType === ImageDiffType.Swipe &&
          this.renderSwipe(height, width, containerWidth)}
        {this.props.diffType === ImageDiffType.OnionSkin &&
          this.renderFade(height, width, containerWidth)}
        {this.props.diffType === ImageDiffType.Difference &&
          this.renderDifference(height, width, containerWidth)}
        <TabBar
          selectedIndex={this.props.diffType}
          onTabClicked={this.props.onChangeDiffType}
          type={TabBarType.Switch}
        >
          <span>2-up</span>
          <span>Swipe</span>
          <span>Onion Skin</span>
          <span>Difference</span>
        </TabBar>
      </div>
    )
  }

  private render2Up(height: number, width: number, widthContainer: number) {
    const style = {
      maxHeight: height + SIZE_CONTROLS,
      maxWidth: Math.min((widthContainer - 20) / 2, width),
    }
    return (
      <div className="image-diff_inner--two-up">
        <div className="image-diff__before">
          <div className="image-diff__header">Deleted</div>
          {renderImage(this.props.previous, {
            onLoad: this.onPreviousImageLoad,
            style,
          })}
          <div className="image-diff__footer">
            <span className="strong">W:</span>{' '}
            {this.state.previousImageSize!.width}px |{' '}
            <span className="strong">H:</span>{' '}
            {this.state.previousImageSize!.height}px
          </div>
        </div>
        <div className="image-diff__after">
          <div className="image-diff__header">Added</div>
          {renderImage(this.props.current, {
            onLoad: this.onCurrentImageLoad,
            style,
          })}
          <div className="image-diff__footer">
            <span className="strong">W:</span>{' '}
            {this.state.currentImageSize!.width}px |{' '}
            <span className="strong">H:</span>{' '}
            {this.state.currentImageSize!.height}px
          </div>
        </div>
      </div>
    )
  }

  private renderDifference(
    height: number,
    width: number,
    widthContainer: number
  ) {
    return (
      <div
        className="image-diff_inner--difference"
        style={{
          height,
          width,
          left: (widthContainer - PADDING - width) / 2 + PADDING / 2,
        }}
      >
        <div className="image-diff__before">
          {renderImage(this.props.previous, {
            onLoad: this.onPreviousImageLoad,
            style: {
              maxHeight: height,
              maxWidth: width,
            },
          })}
        </div>
        <div className="image-diff__after">
          {renderImage(this.props.current, {
            onLoad: this.onCurrentImageLoad,
            style: {
              maxHeight: height,
              maxWidth: width,
              mixBlendMode: 'difference',
            },
          })}
        </div>
      </div>
    )
  }

  private renderFade(height: number, width: number, widthContainer: number) {
    const style = {
      height,
      width,
    }
    return (
      <div
        className="image-diff_inner--fade"
        style={{
          ...style,
          marginBottom: 30,
          left: (widthContainer - PADDING - width) / 2 + PADDING / 2,
        }}
      >
        <div className="image-diff__before" style={style}>
          {renderImage(this.props.previous, {
            onLoad: this.onPreviousImageLoad,
            style: {
              maxHeight: height,
              maxWidth: width,
            },
          })}
        </div>
        <div
          className="image-diff__after"
          style={{
            ...style,
            opacity: this.state.value,
          }}
        >
          {renderImage(this.props.current, {
            onLoad: this.onCurrentImageLoad,
            style: {
              maxHeight: height,
              maxWidth: width,
            },
          })}
        </div>
        <input
          style={{ margin: `${height + 10}px 0 0 ${(width - 129) / 2}px` }}
          type="range"
          max={1}
          min={0}
          value={this.state.value}
          step={0.001}
          onChange={this.onValueChange}
        />
      </div>
    )
  }

  private renderSwipe(height: number, width: number, widthContainer: number) {
    const style = {
      height,
      width,
    }
    return (
      <div
        className="image-diff_inner--swipe"
        style={{
          ...style,
          marginBottom: 30,
          left: (widthContainer - PADDING - width) / 2 + PADDING / 2,
        }}
      >
        <div className="image-diff__after" style={style}>
          {renderImage(this.props.current, {
            onLoad: this.onCurrentImageLoad,
            style: {
              maxHeight: height,
              maxWidth: width,
            },
          })}
        </div>
        <div
          className="image-diff--swiper"
          style={{
            width: width * (1 - this.state.value),
            height: height + 10,
          }}
        >
          <div className="image-diff__before" style={style}>
            {renderImage(this.props.previous, {
              onLoad: this.onPreviousImageLoad,
              style: {
                maxHeight: height,
                maxWidth: width,
              },
            })}
          </div>
        </div>
        <input
          style={{ margin: `${height + 10}px 0 0 -7px`, width: width + 14 }}
          type="range"
          max={1}
          min={0}
          value={this.state.value}
          step={0.001}
          onChange={this.onValueChange}
        />
      </div>
    )
  }
}