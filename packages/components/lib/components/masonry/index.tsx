import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ItemQueue } from "../../utils/item-queue.ts";
import { debounce, throttle } from "../../utils/utils.ts";

import styles from "./index.module.scss";

type ItemWithPos<T> = {
	x: number;
	y: number;
	width: number;
	height: number;
	bottom: number;
	index: number;
	item: T;
};

/**
 * 瀑布流组件参数
 */
export interface MasonryProps<T> {
	/**
	 * 数据
	 */
	data: Array<T>;
	/**
	 * 行标识
	 */
	rowKey: keyof T;
	/**
	 * 列数
	 */
	columns: number;
	/**
	 * 间距
	 */
	gutter: number;
	/**
	 * 预渲染数量, 默认为 6
	 */
	preRenderNumber?: number;

	/**
	 * 滚动容器
	 */
	scrollContainer: React.RefObject<HTMLDivElement>;

	/**
	 * 底部阈值，默认为 100
	 */
	bottomThreshold?: number;

	/**
	 * 到达底部
	 */
	onReachBottom?: () => void;

	/**
	 * 渲染函数
	 * @param item
	 * @param width
	 * @param x
	 * @param y
	 * @param index
	 * @param onItemMounted
	 */
	render: (
		item: T,
		width: number,
		x: number,
		y: number,
		index: number,
		onItemMounted?: () => void
	) => React.ReactNode;
}

export function Masonry<T>({
	data,
	rowKey,
	columns,
	gutter,
	scrollContainer,
	preRenderNumber = 6,
	bottomThreshold = 100,
	onReachBottom,
	render,
}: MasonryProps<T>) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const tempRef = React.useRef<HTMLDivElement>(null);
	const ref = React.useRef<HTMLDivElement>(null);
	const idxRef = useRef(0);
	const containerWidthRef = useRef(0);

	const [colWidth, setColWidth] = React.useState(0);
	const [boxHeight, setBoxHeight] = React.useState(0);
	const [scrollTop, setScrollTop] = useState(0);

	const [preRenderChildren, setPreRenderChildren] = React.useState<
		React.ReactNode[]
	>([]);

	const [itemWithPos, setItemWithPos] = useState<ItemWithPos<T>[]>([]);

	const calculateColWidth = useCallback(() => {
		if (containerRef.current && scrollContainer.current) {
			const clientWidth = containerRef.current.clientWidth;
			const paddingLeft = parseInt(
				getComputedStyle(containerRef.current).paddingLeft
			);
			const paddingRight = parseInt(
				getComputedStyle(containerRef.current).paddingRight
			);
			if (containerWidthRef.current === clientWidth) return;
			containerWidthRef.current = clientWidth;
			scrollContainer.current.scrollTop = 0;
			setColWidth(
				(clientWidth - (columns - 1) * gutter - paddingLeft - paddingRight) /
					columns
			);
		}
	}, [columns, gutter, scrollContainer]);

	const shouldRender = React.useCallback(
		(item: ItemWithPos<T>) => {
			if (scrollContainer.current == null) {
				return false;
			}

			const offsetHeight = scrollContainer.current.offsetHeight;

			// 元素和可视区域有交叠，则渲染，否则隐藏
			const top = item.y - scrollTop;
			const bottom = item.bottom - scrollTop;

			const threshold = 800;

			const x = -threshold;
			const y = offsetHeight + threshold;

			return (
				(top > x && top < y) ||
				(bottom > x && bottom < y) ||
				(top < x && bottom > y)
			);
		},
		[scrollContainer, scrollTop]
	);

	useEffect(() => {
		if (
			scrollContainer.current == null ||
			containerRef.current == null ||
			tempRef.current == null ||
			ref.current == null ||
			data.length === 0 ||
			colWidth === 0
		) {
			return;
		}

		idxRef.current = 0;
		setPreRenderChildren([]);
		setItemWithPos([]);

		// 渲染到 temp 容器中，获取 dom 真实尺寸
		const queue = new ItemQueue<T>();
		const hArr = new Array(columns).fill(0);

		queue.subscribe((items) => {
			setPreRenderChildren(
				items.map((item, index) =>
					createPortal(
						render(item, colWidth, 0, 0, index),
						tempRef.current!,
						item[rowKey] as string
					)
				)
			);
		});

		const preRenderItem = () => {
			if (data.length === 0 || idxRef.current >= data.length) {
				setBoxHeight(Math.max(...hArr));
				setPreRenderChildren([]);
				return;
			}
			queue.clear();
			const items = data.slice(
				idxRef.current,
				idxRef.current + preRenderNumber
			);
			queue.setItems(items);
		};

		const observerCallback = () => {
			const items: ItemWithPos<T>[] = [];
			const start = idxRef.current;
			tempRef.current?.childNodes?.forEach((node) => {
				const ele = node as HTMLElement;
				let col = idxRef.current % columns;
				if (idxRef.current >= columns) {
					col = hArr.indexOf(Math.min(...hArr));
				}
				items.push({
					x: col * (colWidth + gutter),
					y: hArr[col],
					width: colWidth,
					height: ele.offsetHeight,
					bottom: hArr[col] + ele.offsetHeight,
					index: idxRef.current,
					item: data[idxRef.current],
				});
				idxRef.current++;
				hArr[col] += ele.offsetHeight + gutter;
			});

			// 如果是第一次渲染，则直接设置
			if (start === 0) {
				setItemWithPos(items);
			} else {
				setItemWithPos((prev) => [...prev, ...items]);
			}

			preRenderItem();
		};

		const observer = new MutationObserver(observerCallback);

		observer.observe(tempRef.current, {
			childList: true,
			subtree: true,
		});

		preRenderItem();

		return () => {
			queue.unsubscribe();
			observer.disconnect();
		};
	}, [
		colWidth,
		columns,
		data,
		gutter,
		preRenderNumber,
		render,
		rowKey,
		scrollContainer,
	]);

	useEffect(() => {
		const delay = 200;

		const throttledCallback = throttle(calculateColWidth, delay);
		const debouncedCallback = debounce(calculateColWidth, delay);

		const resizeObserver = new ResizeObserver(() => {
			throttledCallback();
			debouncedCallback();
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}
		return () => resizeObserver.disconnect();
	}, [calculateColWidth]);

	// 监听滚动
	useEffect(() => {
		const onScroll = () => {
			if (scrollContainer.current == null) {
				return;
			}
			setScrollTop(scrollContainer.current.scrollTop);
			if (
				scrollContainer.current.scrollTop +
					scrollContainer.current.offsetHeight >=
				scrollContainer.current.scrollHeight - bottomThreshold
			) {
				onReachBottom?.();
			}
		};

		const container = scrollContainer.current;

		const delay = 50;

		const throttledOnScroll = throttle(onScroll, delay);
		const debouncedOnScroll = debounce(onScroll, delay);

		container?.addEventListener(
			"scroll",
			() => {
				throttledOnScroll();
				debouncedOnScroll();
			},
			false
		);

		return () => {
			container?.removeEventListener("scroll", onScroll, false);
		};
	}, [bottomThreshold, onReachBottom, scrollContainer]);

	return (
		<div className={styles.container} ref={containerRef}>
			<div
				className={styles.tempContainer}
				ref={tempRef}
				style={{ width: colWidth }}
			>
				{preRenderChildren}
			</div>
			<div
				className={styles.box}
				ref={ref}
				style={{ height: boxHeight - gutter }}
			>
				{itemWithPos.filter(shouldRender).map((item) => (
					<React.Fragment key={item.item[rowKey] as React.Key}>
						{shouldRender(item)
							? render(item.item, colWidth, item.x, item.y, item.index)
							: null}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}
