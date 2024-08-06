import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { debounce, throttle } from "../../utils/utils";
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
	columnCount: number;

	columnCountBreakPoints?: Record<number, number>;

	/**
	 * 间距
	 */
	gutter: number;

	/**
	 * 滚动容器
	 */
	scrollContainer: Window | HTMLElement | string;

	/**
	 * 真实容器
	 */
	containerRef: React.RefObject<HTMLDivElement>;

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
	columnCount,
	columnCountBreakPoints,
	gutter,
	scrollContainer,
	containerRef,
	bottomThreshold = 100,
	onReachBottom,
	render,
}: MasonryProps<T>) {
	const tempRef = React.useRef<HTMLDivElement>(null);
	const ref = React.useRef<HTMLDivElement>(null);
	const tempRootRef = useRef<Root | null>(null);
	const rootRef = useRef<Root | null>(null);

	// const idxRef = useRef(0);
	// const containerWidthRef = useRef(0);
	const columnsRef = useRef(0);
	const gutterRef = useRef(gutter);
	const colWidthRef = useRef(0);
	const itemsRef = useRef<Record<string, ItemWithPos<T>>>({});
	const hArrRef = useRef<Array<number>>([]);
	const initialRef = useRef(false);

	const [boxHeight, setBoxHeight] = React.useState(0);
	const [scrollTop, setScrollTop] = React.useState(0);
	const [offsetHeight, setOffsetHeight] = React.useState(0);
	const [clientWidth, setClientWidth] = React.useState(0);

	const columns = useMemo(() => {
		let _columns = columnCount;
		if (columnCountBreakPoints != null) {
			const keys = Object.keys(columnCountBreakPoints).map(Number);
			keys.sort((a, b) => b - a);
			for (const key of keys) {
				if (clientWidth > Number(key)) {
					_columns = columnCountBreakPoints![key];
					break;
				}
			}
		}

		return _columns;
	}, [clientWidth, columnCount, columnCountBreakPoints]);

	const colWidth = useMemo(() => {
		if (columns === 0 || clientWidth === 0) {
			return 0;
		}
		return (clientWidth - (columns + 1) * gutter) / columns;
	}, [clientWidth, columns, gutter]);

	/**
	 * x 表示当前元素的 x 坐标
	 * y 表示当前元素的 y 坐标 + 当前元素的高度
	 */
	const shouldRender = useCallback(
		(x: number, y: number) => {
			const threshold = 800;
			const top = -threshold;
			const bottom = offsetHeight + threshold;

			const _x = x - scrollTop;
			const _y = y - scrollTop;

			if (
				(_x > top && _x < bottom) ||
				(_y > top && _y < bottom) ||
				(_x < top && _y > bottom)
			) {
				return true;
			}
			return false;
		},
		[offsetHeight, scrollTop]
	);

	const renderItems = useCallback(() => {
		const itemWithPosList = data.map(
			(item) => itemsRef.current[item[rowKey] as string]
		);
		const children = itemWithPosList.map((itemWithPos) => {
			const { item, x, y, width, index } = itemWithPos;
			return (
				<React.Fragment key={item[rowKey] as string}>
					{shouldRender(y, itemWithPos.bottom)
						? render(item, width, x, y, index)
						: null}
				</React.Fragment>
			);
		});
		rootRef.current?.render(children);
		initialRef.current = true;
	}, [data, render, rowKey, shouldRender]);

	useEffect(() => {
		columnsRef.current = columns;
	}, [columns]);

	useEffect(() => {
		if (
			containerRef.current == null ||
			tempRef.current == null ||
			colWidth === 0 ||
			data.length === 0
		) {
			return;
		}

		let reRenderAll = false;

		if (gutterRef.current !== gutter) {
			gutterRef.current = gutter;
			reRenderAll = true;
		}

		if (colWidthRef.current !== colWidth) {
			colWidthRef.current = colWidth;
			reRenderAll = true;
		}
		if (initialRef.current === false) {
			reRenderAll = true;
		}

		let _data = data;

		if (!reRenderAll) {
			const set = new Set(Object.keys(itemsRef.current));
			_data = data.filter((item) => !set.has(item[rowKey] as string));
		}

		// 不存在未渲染的元素
		if (_data.length === 0) {
			renderItems();
			return;
		}

		const observer = new MutationObserver((records) => {
			const hArr: number[] = [];
			for (const record of records) {
				for (const node of record.addedNodes) {
					const ele = node as HTMLElement;
					hArr.push(ele.offsetHeight);
				}
			}

			_data.forEach((item, index) => {
				const _index = index + data.length - _data.length;
				let col = _index % columnsRef.current;
				if (_index >= columnsRef.current) {
					col = hArrRef.current.indexOf(Math.min(...hArrRef.current));
				}

				itemsRef.current[item[rowKey] as string] = {
					x: col * (colWidth + gutter) + gutter,
					y: hArrRef.current[col],
					width: colWidth,
					height: hArr[index],
					bottom: hArrRef.current[col] + hArr[index],
					index: _index,
					item,
				};

				hArrRef.current[col] += hArr[index] + gutter;
			});
			if (ref.current != null) {
				if (rootRef.current == null) {
					rootRef.current = createRoot(ref.current);
				}

				setBoxHeight(Math.max(...hArrRef.current));

				renderItems();

				observer.disconnect();

				tempRootRef.current?.render([]);
			}
		});

		observer.observe(tempRef.current, {
			childList: true,
			subtree: true,
		});

		if (tempRootRef.current == null) {
			tempRootRef.current = createRoot(tempRef.current);
		}

		if (reRenderAll) {
			itemsRef.current = {};
			hArrRef.current = new Array(columnsRef.current).fill(gutter);
		}

		const children = _data.map((item, index) => (
			<React.Fragment key={item[rowKey] as string}>
				{render(item, colWidth, 0, 0, index)}
			</React.Fragment>
		));

		tempRootRef.current?.render(children);
	}, [colWidth, containerRef, data, gutter, render, renderItems, rowKey]);

	useEffect(() => {
		if (scrollContainer == null) {
			return;
		}
		const onResize = () => {
			setClientWidth(containerRef.current!.clientWidth);

			if (scrollContainer === window) {
				setOffsetHeight(window.innerHeight);
			} else {
				if (scrollContainer instanceof HTMLElement) {
					setOffsetHeight(scrollContainer.clientHeight);
				}
				if (typeof scrollContainer === "string") {
					const ele = document.querySelector(scrollContainer);
					if (ele != null) {
						setOffsetHeight(ele.clientHeight);
					}
				}
			}
		};

		const throttledOnResize = throttle(onResize, 100);
		const debounceOnResize = debounce(onResize, 100);

		const _onResize = () => {
			throttledOnResize();
			debounceOnResize();
		};

		onResize();

		if (scrollContainer === window) {
			window.addEventListener("resize", _onResize);
		}

		const resizeObserver = new ResizeObserver(_onResize);

		if (scrollContainer instanceof HTMLElement) {
			resizeObserver.observe(scrollContainer);
		}
		if (typeof scrollContainer === "string") {
			const ele = document.querySelector(scrollContainer);
			if (ele != null) {
				resizeObserver.observe(ele);
			}
		}
		return () => {
			if (scrollContainer === window) {
				window.removeEventListener("resize", _onResize);
			}
			if (scrollContainer instanceof HTMLElement) {
				resizeObserver.disconnect();
			}
			if (typeof scrollContainer === "string") {
				const ele = document.querySelector(scrollContainer);
				if (ele != null) {
					resizeObserver.disconnect();
				}
			}
		};
	}, [columns, containerRef, gutter, scrollContainer]);

	useEffect(() => {
		if (scrollContainer == null) {
			return;
		}

		const onScroll = () => {
			if (scrollContainer === window) {
				setScrollTop(window.scrollY);
				if (
					window.innerHeight + window.scrollY >=
					document.body.scrollHeight - bottomThreshold
				) {
					onReachBottom?.();
				}
			}
			if (scrollContainer instanceof HTMLElement) {
				setScrollTop(scrollContainer.scrollTop);
				if (
					scrollContainer.clientHeight + scrollContainer.scrollTop >=
					scrollContainer.scrollHeight - bottomThreshold
				) {
					onReachBottom?.();
				}
			}
			if (typeof scrollContainer === "string") {
				const ele = document.querySelector(scrollContainer);
				if (ele != null) {
					setScrollTop(ele.scrollTop);
					if (
						ele.clientHeight + ele.scrollTop >=
						ele.scrollHeight - bottomThreshold
					) {
						onReachBottom?.();
					}
				}
			}
		};

		const throttledOnScroll = throttle(onScroll, 100);
		const debouncedOnScroll = debounce(onScroll, 100);

		const _onScroll = () => {
			throttledOnScroll();
			debouncedOnScroll();
		};

		if (scrollContainer === window) {
			window.addEventListener("scroll", _onScroll, false);
		}
		if (scrollContainer instanceof HTMLElement) {
			scrollContainer.addEventListener("scroll", _onScroll, false);
		}
		if (typeof scrollContainer === "string") {
			const ele = document.querySelector(scrollContainer);
			if (ele != null) {
				ele.addEventListener("scroll", _onScroll, false);
			}
		}

		return () => {
			if (scrollContainer === window) {
				window.removeEventListener("scroll", _onScroll);
			}
			if (scrollContainer instanceof HTMLElement) {
				scrollContainer.removeEventListener("scroll", _onScroll);
			}
			if (typeof scrollContainer === "string") {
				const ele = document.querySelector(scrollContainer);
				if (ele != null) {
					ele.removeEventListener("scroll", _onScroll);
				}
			}
		};
	}, [bottomThreshold, onReachBottom, scrollContainer]);

	return (
		<>
			<div
				className={styles.tempContainer}
				ref={tempRef}
				style={{ width: colWidth }}
			></div>
			<div className={styles.box} ref={ref} style={{ height: boxHeight }}></div>
		</>
	);
}
