import * as React from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./index.module.scss";
import { createPortal } from "react-dom";
import { MyQueue } from "../../utils/my-queue.ts";
import { throttle } from "../../utils/utils.ts";

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
	render,
}: MasonryProps<T>) {
	const containerRef = React.useRef<HTMLDivElement>(null);
	const tempRef = React.useRef<HTMLDivElement>(null);
	const ref = React.useRef<HTMLDivElement>(null);
	const idxRef = useRef(0);

	const [colWidth, setColWidth] = React.useState(0);
	const [boxHeight, setBoxHeight] = React.useState(0);

	const [preRenderChildren, setPreRenderChildren] = React.useState<
		React.ReactNode[]
	>([]);
	const [itemWithPos, setItemWithPos] = useState<ItemWithPos<T>[]>([]);

	const [scrollTop, setScrollTop] = useState(0);

	useEffect(() => {
		if (
			containerRef.current == null ||
			tempRef.current == null ||
			ref.current == null ||
			data.length <= 0
		) {
			return;
		}

		const rect = containerRef.current.getBoundingClientRect();
		const paddingLeft = parseInt(
			getComputedStyle(containerRef.current).paddingLeft
		);
		const paddingRight = parseInt(
			getComputedStyle(containerRef.current).paddingRight
		);
		const totalWidth = rect.width - paddingLeft - paddingRight;
		const colWidth = (totalWidth - (columns - 1) * gutter) / columns;

		setColWidth(colWidth);

		const hArr = new Array(columns).fill(0);

		const myQueue = new MyQueue<T>();
		// 先订阅
		myQueue.subscribe((items) => {
			setPreRenderChildren(
				items.map((item) =>
					createPortal(
						render(item, colWidth, 0, 0, 0),
						tempRef.current!,
						item[rowKey] as string
					)
				)
			);
		});

		const batchDispatchItem = () => {
			if (idxRef.current >= data.length - 1) {
				setPreRenderChildren([]);
				myQueue.clear();
				return;
			}
			const items: Record<string, T> = {};
			// 先进行预渲染
			for (
				let i = myQueue.size() - 1;
				i < myQueue.size() - 1 + preRenderNumber && i < data.length;
				i++
			) {
				items[i] = data[i];
			}
			myQueue.setItems(items);
		};

		// 监听 tempContainer 变化
		const observer = new MutationObserver((records) => {
			const items: ItemWithPos<T>[] = [];
			for (const record of records) {
				for (let i = 0; i < record.addedNodes.length; i++) {
					let col = idxRef.current % columns;
					if (idxRef.current > columns) {
						for (let n = 0; n < columns; n++) {
							if (hArr[n] < hArr[col]) {
								col = n;
							}
						}
					}
					const offsetHeight = (record.addedNodes[i] as HTMLElement)
						.offsetHeight;
					items.push({
						x: (colWidth + gutter) * col,
						y: hArr[col],
						width: colWidth,
						height: offsetHeight,
						bottom: hArr[col] + offsetHeight,
						index: idxRef.current,
						item: data[idxRef.current++],
					});
					hArr[col] += offsetHeight + gutter;
					setBoxHeight(Math.max(...hArr));
				}
			}

			setItemWithPos((prev) => [...prev, ...items]);

			// 继续派发
			batchDispatchItem();
		});

		observer.observe(tempRef.current, { childList: true, subtree: true });

		// 先派发第一批元素
		batchDispatchItem();
	}, [columns, gutter, data, render, rowKey, preRenderNumber]);

	useEffect(() => {
		if (scrollContainer.current == null) {
			return;
		}

		const onScroll = throttle((e: WindowEventMap["scroll"]) => {
			const dom = e.currentTarget as HTMLElement;
			setScrollTop(dom.scrollTop);
		}, 60);

		console.log(scrollContainer.current);

		const container = scrollContainer.current;

		container?.addEventListener("scroll", onScroll, false);

		return () => {
			container?.removeEventListener("scroll", onScroll, false);
		};
	}, [scrollContainer]);

	// 是否应该渲染
	const shouldRender = React.useCallback(
		(item: ItemWithPos<T>) => {
			if (scrollContainer.current == null) {
				return false;
			}

			const offsetHeight = scrollContainer.current.offsetHeight;

			// 元素和可视区域有交叠，则渲染，否则隐藏
			const top = item.y - scrollTop;
			const bottom = item.bottom - scrollTop;

			const x = -100;
			const y = offsetHeight + 100;

			if (
				(top > x && top < y) ||
				(bottom > x && bottom < y) ||
				(top < x && bottom > y)
			) {
				return true;
			}

			return false;
		},
		[scrollTop, scrollContainer]
	);

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
						{render(item.item, colWidth, item.x, item.y, item.index)}
					</React.Fragment>
				))}
			</div>
		</div>
	);
}
