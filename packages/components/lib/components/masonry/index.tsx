import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
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
	 * 预渲染数量, 默认为 40
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
	preRenderNumber = 40,
	bottomThreshold = 100,
	onReachBottom,
	render,
}: MasonryProps<T>) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const tempRef = React.useRef<HTMLDivElement>(null);
	const ref = React.useRef<HTMLDivElement>(null);
	const idxRef = useRef(0);
	const containerWidthRef = useRef(0);
	const columnsRef = useRef(columns);
	const gutterRef = useRef(gutter);
	const colWidthRef = useRef(0);
	const itemsRef = useRef<Record<string, ItemWithPos<T>>>({});
	const hArrRef = useRef<Array<number>>(new Array(columns).fill(0));

	const [colWidth, setColWidth] = React.useState(0);
	const [boxHeight, setBoxHeight] = React.useState(0);
	const [scrollTop, setScrollTop] = React.useState(0);

	const [preRenderChildren, setPreRenderChildren] = React.useState<
		React.ReactNode[]
	>([]);

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
		(item?: ItemWithPos<T>) => {
			if (scrollContainer.current == null || item == null) {
				return false;
			}

			const offsetHeight = scrollContainer.current.offsetHeight;

			// 元素和可视区域有交叠，则渲染，否则隐藏
			const top = item.y - scrollTop;
			const bottom = item.bottom - scrollTop;

			const threshold = 800;

			const x = -threshold;
			const y = offsetHeight + threshold;

			const isRender =
				(top > x && top < y) ||
				(bottom > x && bottom < y) ||
				(top < x && bottom > y);

			return isRender;
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

		let rerender = false;

		// 如果 columns 变化
		if (columnsRef.current !== columns) {
			rerender = true;
			columnsRef.current = columns;
		}

		// 如果  gutter 变化
		if (gutterRef.current !== gutter) {
			rerender = true;
			gutterRef.current = gutter;
		}

		// 如果 colWidth 变化
		if (colWidthRef.current !== colWidth) {
			rerender = true;
			colWidthRef.current = colWidth;
		}

		idxRef.current = 0;
		setPreRenderChildren([]);

		// 渲染到 temp 容器中，获取 dom 真实尺寸
		const queue = new ItemQueue<T>();

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

		let _data = data;

		// 不需要全量渲染
		if (!rerender) {
			const idSet = new Set(Object.keys(itemsRef.current));
			_data = data.filter((item) => !idSet.has(item[rowKey] as string));
		} else {
			itemsRef.current = {};
			hArrRef.current = new Array(columns).fill(0);
		}

		const preRenderItem = () => {
			if (_data.length === 0 || idxRef.current >= _data.length) {
				setBoxHeight(Math.max(...hArrRef.current));
				setPreRenderChildren([]);
				return;
			}
			queue.clear();
			const items: Array<T> = [];
			for (
				let i = idxRef.current;
				i < idxRef.current + preRenderNumber && i < _data.length;
				i++
			) {
				items.push(_data[i]);
			}
			if (items.length !== 0) {
				queue.setItems(items);
			}
		};

		const observerCallback = () => {
			tempRef.current?.childNodes?.forEach((node) => {
				const ele = node as HTMLElement;
				let col = idxRef.current % columns;
				if (idxRef.current >= columns) {
					col = hArrRef.current.indexOf(Math.min(...hArrRef.current));
				}

				itemsRef.current[_data[idxRef.current][rowKey] as string] = {
					x: col * (colWidth + gutter),
					y: hArrRef.current[col],
					width: colWidth,
					height: ele.offsetHeight,
					bottom: hArrRef.current[col] + ele.offsetHeight,
					index: idxRef.current,
					item: _data[idxRef.current],
				};
				idxRef.current++;
				hArrRef.current[col] += ele.offsetHeight + gutter;
			});

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

	// columns 变化会导致全量渲染
	// gutter 变化会导致全量渲染
	// colWidth 变化会导致全量渲染
	// data 变化会导致增量渲染

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

		const delay = 10;

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

	// useEffect(() => {
	// 	console.log("itemWithPos", itemWithPos);
	// }, [itemWithPos]);

	console.log("data", data);

	console.log("itemsRef", itemsRef.current);

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
				{data
					.map((item) => itemsRef.current[item[rowKey] as string])
					.filter(shouldRender)
					.map((item) => (
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
